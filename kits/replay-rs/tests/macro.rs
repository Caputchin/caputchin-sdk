//! End-to-end check of the generated C-ABI, run natively (no wasm runner): grow
//! "memory" with cap_alloc, fill trace + config, call cap_run, read the verdict
//! ints back. Exercises the exact marshalling path the JS host uses.
use caputchin_replay_rs::{Verdict, caputchin_replay};

fn run(seed: [u32; 4], config: &[i32], trace: &[u8]) -> Verdict {
    Verdict {
        passed: !trace.is_empty(),
        score: trace.iter().map(|&b| b as i32).sum::<i32>()
            + config.iter().sum::<i32>()
            + seed[0] as i32,
        duration_ms: 16,
    }
}

caputchin_replay!(run);

#[test]
fn cap_run_marshals_inputs_and_returns_verdict() {
    unsafe {
        let trace = [1u8, 2, 3];
        let tp = cap_alloc(trace.len());
        std::ptr::copy_nonoverlapping(trace.as_ptr(), tp, trace.len());

        let cfg = [10i32, 20];
        let cp = cap_alloc(cfg.len() * 4) as *mut i32;
        std::ptr::copy_nonoverlapping(cfg.as_ptr(), cp, cfg.len());

        let vp = cap_run(7, 0, 0, 0, tp, trace.len(), cp as *const i32, cfg.len());
        assert_eq!(*vp.offset(0), 1); // passed = true (non-empty trace)
        assert_eq!(*vp.offset(1), (1 + 2 + 3) + (10 + 20) + 7); // score
        assert_eq!(*vp.offset(2), 16); // duration_ms
    }
}

#[test]
fn null_trace_and_config_are_empty_slices() {
    unsafe {
        let vp = cap_run(0, 0, 0, 0, std::ptr::null(), 0, std::ptr::null(), 0);
        assert_eq!(*vp.offset(0), 0); // passed = false (empty trace)
        assert_eq!(*vp.offset(1), 0); // score
        assert_eq!(*vp.offset(2), 16);
    }
}
