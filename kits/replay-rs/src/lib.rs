//! Rust authoring crate for Caputchin server-validated game replay.
//!
//! Caputchin hosts a deterministic-replay captcha: a game records a trace, and
//! the server re-runs the same sim over that trace and trusts only the replayed
//! verdict. A conforming replay artifact is a freestanding WASM module exporting
//! a tiny C-ABI the host marshals into. This crate writes that C-ABI for you.
//!
//! Author a deterministic `run` (no clock, no RNG beyond the seed, no host
//! calls), then invoke [`caputchin_replay!`] once at your crate root:
//!
//! ```ignore
//! use caputchin_replay_rs::{caputchin_replay, Verdict};
//!
//! fn run(seed: [u32; 4], config: &[i32], trace: &[u8]) -> Verdict {
//!     // decode config + trace, step the deterministic sim, return the result.
//!     Verdict { passed: true, score: 0, duration_ms: 0 }
//! }
//!
//! caputchin_replay!(run);
//! ```
//!
//! The generated `cap_alloc` / `cap_run` exports, compiled to
//! `wasm32-unknown-unknown` with `crate-type = ["cdylib"]`, are a complete
//! headless replay artifact: no `wasm-bindgen`, no imports.
//!
//! `config` and `trace` are opaque to this crate. The host writes whatever
//! bytes (trace) and i32 array (config) your game encoded; your `run` decodes
//! them. The JS host glue lives in `@caputchin/replay-wasm`; the shapes are
//! owned by `@caputchin/replay-contract`.

#![no_std]

extern crate alloc;

/// The result of a replay run. Matches the `Verdict` shape in
/// `@caputchin/replay-contract`: a pass/fail flag, an integer score, and a
/// duration in milliseconds. Serialized across the C-ABI as three little-endian
/// `i32`s `[passed, score, duration_ms]`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Verdict {
    /// Whether the round was completed successfully.
    pub passed: bool,
    /// The game-defined integer score.
    pub score: i32,
    /// Wall-clock-equivalent duration of the round in milliseconds.
    pub duration_ms: i32,
}

/// Emit the Caputchin replay C-ABI (`cap_alloc`, `cap_run`) from a `run`
/// function with signature `fn([u32; 4], &[i32], &[u8]) -> Verdict`.
///
/// Invoke once at crate root. The exports are `#[no_mangle] extern "C"`, so the
/// host loads the compiled module and calls them directly: it grows linear
/// memory with `cap_alloc`, fills the trace bytes and config i32s, then calls
/// `cap_run(seed.0, seed.1, seed.2, seed.3, trace_ptr, trace_len, cfg_ptr,
/// cfg_len)` and reads the three-`i32` verdict back from the returned pointer.
///
/// Allocations are intentionally leaked: a replay isolate runs exactly one
/// round and is then discarded, so there is no free path to get wrong.
#[macro_export]
macro_rules! caputchin_replay {
    ($run:path) => {
        /// Allocate `len` bytes in WASM linear memory and hand the pointer to
        /// the host, which fills it (trace bytes or config i32s). Leaked.
        #[unsafe(no_mangle)]
        pub extern "C" fn cap_alloc(len: usize) -> *mut u8 {
            let mut buf = $crate::__rt::Vec::<u8>::with_capacity(if len == 0 { 1 } else { len });
            let ptr = buf.as_mut_ptr();
            $crate::__rt::forget(buf);
            ptr
        }

        /// Replay one round. `seed` is four `u32` words; `trace`/`config` are the
        /// opaque bytes/ints the host wrote via `cap_alloc`. Returns a pointer to
        /// a leaked `[passed, score, duration_ms]` (three `i32`) in linear memory.
        ///
        /// # Safety
        /// `trace_ptr` / `cfg_ptr` must each be null or point to `trace_len`
        /// bytes / `cfg_len` `i32`s of valid linear memory written via
        /// `cap_alloc`. The replay host upholds this.
        #[unsafe(no_mangle)]
        pub unsafe extern "C" fn cap_run(
            s0: u32,
            s1: u32,
            s2: u32,
            s3: u32,
            trace_ptr: *const u8,
            trace_len: usize,
            cfg_ptr: *const i32,
            cfg_len: usize,
        ) -> *const i32 {
            let trace: &[u8] = if trace_ptr.is_null() || trace_len == 0 {
                &[]
            } else {
                unsafe { $crate::__rt::from_raw_parts(trace_ptr, trace_len) }
            };
            let config: &[i32] = if cfg_ptr.is_null() || cfg_len == 0 {
                &[]
            } else {
                unsafe { $crate::__rt::from_raw_parts(cfg_ptr, cfg_len) }
            };

            let verdict: $crate::Verdict = $run([s0, s1, s2, s3], config, trace);

            let out =
                $crate::__rt::Box::new([verdict.passed as i32, verdict.score, verdict.duration_ms]);
            $crate::__rt::into_raw(out) as *const i32
        }
    };
}

/// A live-steppable game: the SAME deterministic sim the replay `run` drives,
/// exposed for frame-by-frame stepping by a browser renderer (the Lane 2 pattern).
/// The [`caputchin_live!`] macro emits the browser C-ABI over a type implementing
/// this, so the renderer drives the identical wasm the server replays. Inputs, the
/// render state, and the trace are opaque to this crate.
pub trait LiveGame: Sized {
    /// Construct from the four-word seed and the opaque i32 config (the same array
    /// the replay `run` decodes).
    fn new(seed: [u32; 4], config: &[i32]) -> Self;
    /// Advance one fixed tick with the opaque i32 input the renderer wrote, and
    /// record it into the trace.
    fn step(&mut self, input: &[i32]);
    /// The current render snapshot as i32 words (the layout is the game's own
    /// contract with its renderer). Borrowed until the next call.
    fn state(&mut self) -> &[i32];
    /// The recorded input trace so far (the same bytes the replay `run` consumes).
    fn trace(&self) -> &[u8];
}

/// Emit the Caputchin live-stepping C-ABI (`live_new`, `live_step`, `live_state`,
/// `live_trace`, `live_free`) for a type implementing [`LiveGame`]. Pairs with
/// [`caputchin_replay!`]: both compile from the SAME sim into ONE wasm, so the
/// browser steps the identical module the server replays, and floats agree by
/// construction. The JS host glue lives in `@caputchin/replay-wasm`.
///
/// - `live_new(s0..s3, cfg_ptr, cfg_len) -> *mut Game` (config via `cap_alloc`);
/// - `live_step(game, in_ptr, in_len)` (opaque i32 input via `cap_alloc`);
/// - `live_state(game, out_len) -> *const i32` (writes the word count to `out_len`);
/// - `live_trace(game, out_len) -> *const u8` (writes the byte length to `out_len`);
/// - `live_free(game)`.
#[macro_export]
macro_rules! caputchin_live {
    ($game:ty) => {
        /// Create a live session (free it with `live_free`).
        ///
        /// # Safety
        /// `cfg_ptr` must be null or point to `cfg_len` valid i32s.
        #[unsafe(no_mangle)]
        pub unsafe extern "C" fn live_new(
            s0: u32,
            s1: u32,
            s2: u32,
            s3: u32,
            cfg_ptr: *const i32,
            cfg_len: usize,
        ) -> *mut $game {
            let config: &[i32] = if cfg_ptr.is_null() || cfg_len == 0 {
                &[]
            } else {
                unsafe { $crate::__rt::from_raw_parts(cfg_ptr, cfg_len) }
            };
            let game = <$game as $crate::LiveGame>::new([s0, s1, s2, s3], config);
            $crate::__rt::Box::into_raw($crate::__rt::Box::new(game))
        }

        /// Advance one tick with the opaque i32 input the host wrote.
        ///
        /// # Safety
        /// `game` must be a live pointer from `live_new`; `in_ptr` null or pointing
        /// to `in_len` valid i32s.
        #[unsafe(no_mangle)]
        pub unsafe extern "C" fn live_step(game: *mut $game, in_ptr: *const i32, in_len: usize) {
            let g = unsafe { &mut *game };
            let input: &[i32] = if in_ptr.is_null() || in_len == 0 {
                &[]
            } else {
                unsafe { $crate::__rt::from_raw_parts(in_ptr, in_len) }
            };
            $crate::LiveGame::step(g, input);
        }

        /// Render snapshot pointer; writes the i32 word count to `out_len`. Valid
        /// until the next `live_*` call.
        ///
        /// # Safety
        /// `game` from `live_new`; `out_len` a valid `*mut usize`.
        #[unsafe(no_mangle)]
        pub unsafe extern "C" fn live_state(game: *mut $game, out_len: *mut usize) -> *const i32 {
            let g = unsafe { &mut *game };
            let s = $crate::LiveGame::state(g);
            unsafe {
                *out_len = s.len();
            }
            s.as_ptr()
        }

        /// Recorded trace pointer; writes the byte length to `out_len`.
        ///
        /// # Safety
        /// `game` from `live_new`; `out_len` a valid `*mut usize`.
        #[unsafe(no_mangle)]
        pub unsafe extern "C" fn live_trace(game: *mut $game, out_len: *mut usize) -> *const u8 {
            let g = unsafe { &*game };
            let t = $crate::LiveGame::trace(g);
            unsafe {
                *out_len = t.len();
            }
            t.as_ptr()
        }

        /// Free a live session.
        ///
        /// # Safety
        /// `game` from `live_new`, freed exactly once.
        #[unsafe(no_mangle)]
        pub unsafe extern "C" fn live_free(game: *mut $game) {
            if !game.is_null() {
                drop(unsafe { $crate::__rt::Box::from_raw(game) });
            }
        }
    };
}

/// Implementation detail: re-exports the `alloc`/`core` items the macro expands
/// to, so a consumer crate needs no `extern crate alloc` or imports of its own.
#[doc(hidden)]
pub mod __rt {
    pub use alloc::boxed::Box;
    pub use alloc::vec::Vec;
    pub use core::mem::forget;
    pub use core::slice::from_raw_parts;

    /// `Box::into_raw` for a fixed-size array box, exposed as a free fn so the
    /// macro can stay path-only.
    pub fn into_raw(b: Box<[i32; 3]>) -> *mut [i32; 3] {
        Box::into_raw(b)
    }
}
