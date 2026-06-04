//! The deterministic simulation. THIS is what the server re-runs over the
//! recorded trace, so it must be reproducible bit-for-bit: randomness only from
//! the seed, a fixed tick, no clock, no host calls. rapier3d runs in its
//! enhanced-determinism mode (cross-platform bit-exact on IEEE-754), and the SAME
//! compiled wasm runs live and on replay, so floats agree by construction.
//! Replace the body with your game; keep these rules.
//!
//! Starter game: orbs fall from seeded positions; slide the catcher under them.
//! Catch `target_catches` orbs before the time runs out to win.

use rapier3d::na::Vector3;
use rapier3d::prelude::*;

pub const TICK_HZ: i64 = 60;
const HALF_W: f32 = 6.0; // arena half-width on x
const SPAWN_Y: f32 = 8.0;
const CATCH_Y: f32 = 0.6;
const PLAYER_R: f32 = 0.8;
const ORB_R: f32 = 0.35;
const PLAYER_SPEED: f32 = 9.0; // units/sec

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Phase {
    Playing,
    Won,
    Lost,
}

#[derive(Clone, Copy, Default)]
pub struct Input {
    pub tx: f32,
}

#[derive(Clone, Copy)]
pub struct SimConfig {
    pub target_catches: u32,
    pub fall_speed_milli: i32,
    pub time_limit_ticks: u32,
}

impl Default for SimConfig {
    fn default() -> Self {
        SimConfig {
            target_catches: 8,
            fall_speed_milli: 4000,
            time_limit_ticks: 60 * 45,
        }
    }
}

impl SimConfig {
    /// Order is the wire contract with `config.ts`:
    /// [target_catches, fall_speed_milli, time_limit_ticks].
    pub fn from_ints(ints: &[i32]) -> Self {
        let d = SimConfig::default();
        let g = |i: usize, f: i32| ints.get(i).copied().unwrap_or(f);
        SimConfig {
            target_catches: g(0, d.target_catches as i32).clamp(1, 50) as u32,
            fall_speed_milli: g(1, d.fall_speed_milli).clamp(1000, 12000),
            time_limit_ticks: g(2, d.time_limit_ticks as i32).clamp(60, 60 * 120) as u32,
        }
    }
}

// --- trace codec: one (tick, target-x) record per input change, 6 bytes each ---
pub const REC: usize = 6;
pub fn quant(v: f32) -> i16 {
    (v * 1000.0).round().clamp(-32000.0, 32000.0) as i16
}
pub fn dequant(q: i16) -> f32 {
    q as f32 / 1000.0
}
pub fn write_record(out: &mut Vec<u8>, tick: u32, tx: i16) {
    out.extend_from_slice(&tick.to_le_bytes());
    out.extend_from_slice(&tx.to_le_bytes());
}
pub fn rec_count(t: &[u8]) -> usize {
    t.len() / REC
}
pub fn rec_tick(t: &[u8], i: usize) -> u32 {
    let b = i * REC;
    u32::from_le_bytes([t[b], t[b + 1], t[b + 2], t[b + 3]])
}
pub fn rec_tx(t: &[u8], i: usize) -> i16 {
    let b = i * REC;
    i16::from_le_bytes([t[b + 4], t[b + 5]])
}

fn next_x(rng: &mut u32) -> f32 {
    let mut x = *rng;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    *rng = x;
    (((x >> 8) as f32 / (1u32 << 24) as f32) * 2.0 - 1.0) * (HALF_W - 1.0)
}

pub struct Sim {
    cfg: SimConfig,
    rng: u32,
    bodies: RigidBodySet,
    colliders: ColliderSet,
    pipeline: PhysicsPipeline,
    islands: IslandManager,
    broad: DefaultBroadPhase,
    narrow: NarrowPhase,
    ijoints: ImpulseJointSet,
    mjoints: MultibodyJointSet,
    ccd: CCDSolver,
    ip: IntegrationParameters,
    player: RigidBodyHandle,
    orb: RigidBodyHandle,
    tick: u32,
    score: u32,
    phase: Phase,
    state_buf: Vec<i32>,
}

impl Sim {
    pub fn new(seed: [u32; 4], cfg: SimConfig) -> Self {
        let mut bodies = RigidBodySet::new();
        let mut colliders = ColliderSet::new();
        let player = bodies.insert(
            RigidBodyBuilder::kinematic_position_based()
                .translation(Vector3::new(0.0, 0.5, 0.0))
                .build(),
        );
        colliders.insert_with_parent(ColliderBuilder::ball(PLAYER_R).build(), player, &mut bodies);

        let mut rng = seed[0] ^ seed[1].rotate_left(11) ^ seed[2].rotate_left(19) ^ seed[3];
        if rng == 0 {
            rng = 0x9e37_79b9;
        }
        let orb = bodies.insert(
            RigidBodyBuilder::dynamic()
                .translation(Vector3::new(next_x(&mut rng), SPAWN_Y, 0.0))
                .lock_rotations()
                .build(),
        );
        colliders.insert_with_parent(ColliderBuilder::ball(ORB_R).build(), orb, &mut bodies);

        Sim {
            cfg,
            rng,
            bodies,
            colliders,
            pipeline: PhysicsPipeline::new(),
            islands: IslandManager::new(),
            broad: DefaultBroadPhase::new(),
            narrow: NarrowPhase::new(),
            ijoints: ImpulseJointSet::new(),
            mjoints: MultibodyJointSet::new(),
            ccd: CCDSolver::new(),
            ip: IntegrationParameters::default(),
            player,
            orb,
            tick: 0,
            score: 0,
            phase: Phase::Playing,
            state_buf: Vec::new(),
        }
    }

    pub fn tick_cap(&self) -> u32 {
        self.cfg.time_limit_ticks
    }
    pub fn phase(&self) -> Phase {
        self.phase
    }
    pub fn score(&self) -> u32 {
        self.score
    }
    pub fn tick(&self) -> u32 {
        self.tick
    }

    pub fn step(&mut self, input: Input) {
        if self.phase != Phase::Playing {
            return;
        }
        let fall = self.cfg.fall_speed_milli as f32 / 1000.0;

        // Player: kinematic, slides toward the target x.
        let px = self.bodies[self.player].translation().x;
        let tx = input.tx.clamp(-HALF_W, HALF_W);
        let max = PLAYER_SPEED / TICK_HZ as f32;
        let nx = if (tx - px).abs() > max {
            px + (tx - px).signum() * max
        } else {
            tx
        };
        self.bodies[self.player].set_next_kinematic_translation(Vector3::new(nx, 0.5, 0.0));

        // Orb: constant fall speed.
        self.bodies[self.orb].set_linvel(Vector3::new(0.0, -fall, 0.0), true);

        let gravity = Vector3::new(0.0, 0.0, 0.0);
        self.pipeline.step(
            &gravity,
            &self.ip,
            &mut self.islands,
            &mut self.broad,
            &mut self.narrow,
            &mut self.bodies,
            &mut self.colliders,
            &mut self.ijoints,
            &mut self.mjoints,
            &mut self.ccd,
            None,
            &(),
            &(),
        );

        // Catch test at the catch line, then respawn the orb (caught or missed).
        let orb_t = *self.bodies[self.orb].translation();
        if orb_t.y <= CATCH_Y {
            let player_x = self.bodies[self.player].translation().x;
            if (orb_t.x - player_x).abs() < PLAYER_R + ORB_R {
                self.score += 1;
            }
            let rx = next_x(&mut self.rng);
            self.bodies[self.orb].set_translation(Vector3::new(rx, SPAWN_Y, 0.0), true);
        }

        self.tick += 1;
        if self.score >= self.cfg.target_catches {
            self.phase = Phase::Won;
        } else if self.tick >= self.cfg.time_limit_ticks {
            self.phase = Phase::Lost;
        }
    }

    /// Render snapshot the live renderer reads:
    /// [phase, score, tick, player_x_milli, orb_x_milli, orb_y_milli].
    pub fn state(&mut self) -> &[i32] {
        let p = *self.bodies[self.player].translation();
        let o = *self.bodies[self.orb].translation();
        let m = |v: f32| (v * 1000.0) as i32;
        self.state_buf.clear();
        self.state_buf.extend_from_slice(&[
            match self.phase {
                Phase::Playing => 0,
                Phase::Won => 1,
                Phase::Lost => 2,
            },
            self.score as i32,
            self.tick as i32,
            m(p.x),
            m(o.x),
            m(o.y),
        ]);
        &self.state_buf
    }
}
