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
