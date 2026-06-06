/**
 * @module engine-kit
 *
 * Optional authoring kit for server-validated game replay: the reducer→`run`
 * lane. Write a pure reducer with {@link defineEngine}; {@link toRun} turns it
 * into the conforming `run(seed, config, trace)` the artifact exports, driven by
 * the fixed-step {@link replay} loop and serialized with the default trace codec
 * ({@link encodeTrace} / {@link decodeTrace}).
 *
 * This kit exports ONLY its own surface. Everything it builds on is installed and
 * imported directly from source — the mandatory contract from
 * `@caputchin/replay-contract`, the deterministic primitives (`rng`, `capMath`,
 * the ban shim) from `@caputchin/determinism`, and the determinism self-check
 * from `@caputchin/replay-selfcheck` (which this package also ships as the
 * `caputchin-selfcheck` CLI). It deliberately re-exports none of them.
 */

export { FIXED_TIMESTEP_MS, CODEC_V } from './constants';
export { REACTION_FLOOR_MS, reactionFloorTicks, isHumanReaction } from './reaction';
export { defineEngine } from './define-engine';
export { replay } from './harness';
export { toRun } from './to-run';
export type { ToRunOptions } from './to-run';
export { encodeTrace, decodeTrace } from './trace-codec';
export type {
  Result,
  EngineSetup,
  EngineDef,
  TickInput,
  ReplayInput,
  ReplayOutcome,
} from './types';
