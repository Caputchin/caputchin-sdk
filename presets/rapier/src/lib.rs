//! {{project-name}}: a Caputchin replay game on rapier3d.
//!
//! ONE clean wasm32-unknown-unknown cdylib (no wasm-bindgen, no imports) exposes
//! BOTH C-ABIs over the SAME deterministic `sim`:
//!   - replay (server isolate): `cap_alloc` / `cap_run`, from `caputchin_replay!`.
//!   - live (browser): `live_new` / `live_step` / `live_state` / `live_trace` /
//!     `live_free`, from `caputchin_live!` over a `LiveGame` impl.
//! Because it is literally the same wasm both ends, every float agrees by
//! construction. The browser steps it with `@caputchin/replay-wasm`'s `LiveSim`
//! (paired with the renderer of your choice); the server replays it with the same
//! kit's `runWithModule`.

pub mod sim;

use caputchin_replay_rs::{caputchin_live, caputchin_replay, LiveGame, Verdict};
use sim::{Input, Phase, Sim, SimConfig, TICK_HZ};

fn decode_config(config: &[i32]) -> SimConfig {
    if config.is_empty() {
        SimConfig::default()
    } else {
        SimConfig::from_ints(config)
    }
}

// ----- Replay (headless, server isolate) -------------------------------------

fn run(seed: [u32; 4], config: &[i32], trace: &[u8]) -> Verdict {
    let mut s = Sim::new(seed, decode_config(config));
    let cap = s.tick_cap();
    let n = sim::rec_count(trace);
    let mut idx = 0usize;
    let mut cur = Input::default();
    for tick in 0..cap {
        while idx < n && sim::rec_tick(trace, idx) <= tick {
            cur = Input {
                tx: sim::dequant(sim::rec_tx(trace, idx)),
            };
            idx += 1;
        }
        s.step(cur);
        if s.phase() != Phase::Playing {
            break;
        }
    }
    Verdict {
        passed: s.phase() == Phase::Won,
        score: s.score() as i32,
        duration_ms: (s.tick() as i64 * 1000 / TICK_HZ) as i32,
    }
}

caputchin_replay!(run);

// ----- Live (browser, driven by the OGL render kit) --------------------------

/// Persistent live session: the sim plus the growing input trace. The input is
/// the opaque i32 array the render kit writes; here it is a single target-x word.
pub struct LiveSim {
    sim: Sim,
    trace: Vec<u8>,
    prev: Option<i16>,
}

impl LiveGame for LiveSim {
    fn new(seed: [u32; 4], config: &[i32]) -> Self {
        LiveSim {
            sim: Sim::new(seed, decode_config(config)),
            trace: Vec::new(),
            prev: None,
        }
    }

    fn step(&mut self, input: &[i32]) {
        let qx = input.first().copied().unwrap_or(0).clamp(-32000, 32000) as i16;
        if self.prev != Some(qx) {
            sim::write_record(&mut self.trace, self.sim.tick(), qx);
            self.prev = Some(qx);
        }
        self.sim.step(Input {
            tx: sim::dequant(qx),
        });
    }

    fn state(&mut self) -> &[i32] {
        self.sim.state()
    }

    fn trace(&self) -> &[u8] {
        &self.trace
    }
}

caputchin_live!(LiveSim);
