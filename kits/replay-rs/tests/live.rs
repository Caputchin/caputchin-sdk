//! End-to-end check of the live-stepping C-ABI emitted by `caputchin_live!`:
//! implement `LiveGame`, drive live_new/step/state/trace/free, and read the state
//! (via the out-len pointer) and trace back. Mirrors the JS host path.
use caputchin_replay_rs::{caputchin_live, LiveGame};

// A trivial live game. state = [seed0, config_sum, step_count, last_input_sum];
// trace = the low byte of each step's input sum.
struct Demo {
    seed0: i32,
    cfg_sum: i32,
    steps: i32,
    last: i32,
    state: Vec<i32>,
    trace: Vec<u8>,
}

impl LiveGame for Demo {
    fn new(seed: [u32; 4], config: &[i32]) -> Self {
        Demo {
            seed0: seed[0] as i32,
            cfg_sum: config.iter().sum(),
            steps: 0,
            last: 0,
            state: Vec::new(),
            trace: Vec::new(),
        }
    }
    fn step(&mut self, input: &[i32]) {
        self.last = input.iter().sum();
        self.steps += 1;
        self.trace.push((self.last & 0xff) as u8);
    }
    fn state(&mut self) -> &[i32] {
        self.state.clear();
        self.state
            .extend_from_slice(&[self.seed0, self.cfg_sum, self.steps, self.last]);
        &self.state
    }
    fn trace(&self) -> &[u8] {
        &self.trace
    }
}

caputchin_live!(Demo);

#[test]
fn live_cabi_steps_and_exposes_state_and_trace() {
    unsafe {
        let cfg = [5i32, 6];
        let g = live_new(7, 0, 0, 0, cfg.as_ptr(), cfg.len());
        assert!(!g.is_null());

        let input = [3i32, 4];
        live_step(g, input.as_ptr(), input.len());
        live_step(g, input.as_ptr(), input.len());

        let mut len: usize = 0;
        let sp = live_state(g, &mut len as *mut usize);
        assert_eq!(len, 4);
        let s = std::slice::from_raw_parts(sp, len);
        assert_eq!(s[0], 7); // seed0
        assert_eq!(s[1], 11); // config sum 5 + 6
        assert_eq!(s[2], 2); // steps
        assert_eq!(s[3], 7); // last input sum 3 + 4

        let mut tlen: usize = 0;
        let tp = live_trace(g, &mut tlen as *mut usize);
        assert_eq!(tlen, 2);
        assert_eq!(std::slice::from_raw_parts(tp, tlen), &[7u8, 7]);

        live_free(g);
    }
}

#[test]
fn live_new_handles_null_config() {
    unsafe {
        let g = live_new(1, 2, 3, 4, std::ptr::null(), 0);
        let mut len: usize = 0;
        let sp = live_state(g, &mut len as *mut usize);
        let s = std::slice::from_raw_parts(sp, len);
        assert_eq!(s[1], 0); // empty config -> sum 0
        live_free(g);
    }
}
