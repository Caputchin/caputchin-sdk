//! {{project-name}}: a Caputchin replay game on Bevy.
//!
//! One deterministic sim (`sim`) compiles into two builds:
//!   - default (`bevy_ecs` only) -> the headless C-ABI replay artifact below.
//!   - feature `render` (full Bevy) -> the WebGL browser game (`live`).
//! The same sim runs both ends, which is the determinism guarantee.

pub mod sim;

// Live (render) build: your Bevy WebGL render goes here.
//   1. create src/live.rs with a wasm-bindgen `start(...)` entry that boots a
//      Bevy App, draws the game, records the input trace, and emits a finish
//      event (see README.md and the Wall Smash reference game),
//   2. uncomment the two lines below,
//   3. build with `--features render`.
// #[cfg(feature = "render")]
// mod live;

// The headless replay artifact (default build): the C-ABI the replay host
// marshals into. `caputchin_replay!` writes `cap_alloc` + `cap_run` for us; we
// only supply the deterministic `run`. The live (render) build does not export
// this; it talks to the host over the wasm-bindgen bridge in `live.rs`.
#[cfg(not(feature = "render"))]
mod headless {
    use crate::sim;
    use caputchin_replay_rs::{Verdict, caputchin_replay};

    /// config[0] is the tap target (opaque, server-sourced); trace is the
    /// recorded taps. Decode here, then run the deterministic sim.
    fn run(seed: [u32; 4], config: &[i32], trace: &[u8]) -> Verdict {
        let target = config.first().copied().unwrap_or(5);
        let outcome = sim::replay(seed, trace, target);
        Verdict {
            passed: outcome.passed,
            score: outcome.score,
            duration_ms: outcome.duration_ms,
        }
    }

    caputchin_replay!(run);
}
