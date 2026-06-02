//! The deterministic simulation. THIS is what the server re-runs over the
//! recorded trace, so it must be reproducible bit-for-bit: integer math only,
//! no clock, no randomness beyond `seed`, no host calls. Replace the body with
//! your game; keep those rules.
//!
//! This starter is a tap game: the trace is a sequence of tap ticks, and the
//! round passes once the player taps `target` times.

/// The outcome of a replayed round, mapped to a Caputchin `Verdict` by the
/// headless entry in `lib.rs`.
pub struct Outcome {
    pub passed: bool,
    pub score: i32,
    pub duration_ms: i32,
}

/// Fixed simulation rate. Drives the trace tick units and the duration.
pub const TICK_HZ: i64 = 60;
/// Hard cap on how long a round may run (30s at 60Hz), so a malformed trace
/// cannot loop unboundedly inside the replay isolate.
pub const TICK_CAP: u32 = 60 * 30;

/// Replay a recorded round. `trace` is packed little-endian `u32` tap ticks
/// (4 bytes each); `target` is the number of taps needed to pass (decoded from
/// the opaque, server-sourced config in `lib.rs`). `seed` is unused in this
/// minimal example, but a real game derives its starting state from it.
pub fn replay(_seed: [u32; 4], trace: &[u8], target: i32) -> Outcome {
    let mut taps = 0i32;
    let mut last_tick = 0u32;
    let mut i = 0usize;
    while i + 4 <= trace.len() {
        let tick = u32::from_le_bytes([trace[i], trace[i + 1], trace[i + 2], trace[i + 3]]);
        if tick > TICK_CAP {
            break;
        }
        taps += 1;
        last_tick = tick;
        i += 4;
    }
    Outcome {
        passed: taps >= target.max(1),
        score: taps,
        duration_ms: (last_tick as i64 * 1000 / TICK_HZ) as i32,
    }
}
