// @caputchin/preset-phaser - run a FULL headless Phaser 4 game (including Arcade
// physics) as a Caputchin deterministic-replay sim. Phaser itself is the server
// `run`; the preset makes the engine deterministic so games use real physics
// instead of hand-rolling.
//
// How determinism is achieved (the preset's whole job):
//   1. Fixed timestep      - makePhaserRun drives headlessStep at a fixed delta
//                            (set Arcade `fixedStep: true` + a fixed `fps`); per-tick
//                            logic runs on the `worldstep` event (onWorldStep) so the
//                            recording is frame-rate independent.
//   2. Seeded RNG          - seedFromPlatform derives Phaser's own RandomDataGenerator
//                            from the platform seed; gameplay randomness goes through it.
//   3. Deterministic trig  - makeDeterministic (from @caputchin/determinism) swaps
//                            Math.sin/cos/atan2/pow/... to fdlibm kernels, applied in
//                            BOTH the browser (via /live) and the isolate (via /install),
//                            removing the only cross-engine float divergence. IEEE-754
//                            +-*/ sqrt are already identical everywhere.
//   4. Headless boot       - /install adds the DOM stubs (applyHeadlessDom) + frozen
//                            clock (freezeClock) so Phaser boots with no DOM, server side.
//
// Entry points:
//   '@caputchin/preset-phaser/install' - side-effect, FIRST import of the headless
//                                        run entry (Math swap + DOM stubs + frozen clock).
//   '@caputchin/preset-phaser/live'    - side-effect, FIRST import of the live entry
//                                        (Math swap only; real DOM + clock kept).
//   '@caputchin/preset-phaser/build'   - the dual live + headless tsup config.

// Re-export the shared determinism primitives so authors have one import site
// (including the seeded Math.random trap, now owned by @caputchin/determinism).
export { capMath, makeDeterministic, swapMath, seedRandom, withDeterministicEnv, applyHeadlessDom, freezeClock, mulberry32, createMathRandomTrap } from '@caputchin/determinism';
export type { DeterministicEnv, MathRandomTrap } from '@caputchin/determinism';
export { seedFromPlatform } from './seed.js';
export { bootHeadlessPhaser } from './boot.js';
export { onWorldStep } from './step.js';
export { makePhaserRun } from './run.js';
export type {
  PhaserRunContext,
  PhaserSceneHandle,
  MakePhaserRunOptions,
} from './run.js';
