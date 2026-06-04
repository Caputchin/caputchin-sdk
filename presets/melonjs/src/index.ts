// @caputchin/preset-melonjs - the per-engine on-ramp for running a melonJS game
// headless and deterministically on the Caputchin replay platform.
//
// The point of the preset: make the FULL melonJS engine deterministic - real
// me.Body physics, me.collision response, the engine `world.update` loop - so a
// game author writes a normal melonJS game and gets bit-identical server replay
// for free, instead of hand-rolling integer logic to dodge float drift.
//
// What it owns (the melonJS-specific, safety-critical, tested core):
//  - `defineMelonGame`       the framework-as-sim adapter: a real melonJS game
//                            (Application + physics) -> an engine-kit EngineDef
//                            for `toRun` (the headless replay path).
//  - `createMelonDriver`     the shared fixed-step driver (used by the live mount).
//
// Everything generic - the headless boot env (`applyHeadlessDom` + `freezeClock`)
// and the determinism trap (`withDeterministicEnv`) - lives in the shared
// `@caputchin/determinism` kit, so this preset hand-rolls nothing; re-exported
// below for a single import site. melonJS needed no per-engine shim residual.

// The generic determinism + headless-boot surface from @caputchin/determinism,
// re-exported so a melonJS game author has a single import site.
export { applyHeadlessDom, freezeClock, withDeterministicEnv, rng, rngFromState, capMath } from '@caputchin/determinism';
export type { DeterministicEnv, Rng, RngState } from '@caputchin/determinism';
export { defineMelonGame, createMelonDriver } from './engine.js';
export type {
  MelonNamespace,
  MelonApplication,
  MelonGameApi,
  MelonGameSpec,
  MelonDriver,
} from './engine.js';

// Re-export the lane surface a melonJS game author needs, so the preset is a
// single import site. The reducer-lane mechanism comes from @caputchin/engine-kit
// (which itself re-exports nothing); the contract types from their owner
// @caputchin/replay-contract; the deterministic primitives (rng/capMath, above)
// from @caputchin/determinism.
export {
  toRun,
  defineEngine,
  FIXED_TIMESTEP_MS,
  encodeTrace,
  decodeTrace,
} from '@caputchin/engine-kit';
export type { Result, EngineDef, TickInput } from '@caputchin/engine-kit';
export type { Seed, Verdict, RunFn } from '@caputchin/replay-contract';
