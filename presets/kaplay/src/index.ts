/**
 * @module @caputchin/preset-kaplay
 *
 * The on-ramp for a KAPLAY game on the Caputchin deterministic-replay platform.
 * Self-contained: it makes KAPLAY run headless (a DOM/GL shim + a fixed-step
 * pump), drives determinism through KAPLAY's own seeded RNG + fixed update, and
 * exports the conforming `run`. Its only Caputchin dependency is the mandatory
 * `@caputchin/replay-contract`.
 *
 * Author one scene factory with {@link defineKaplayGame}; mount it live in the
 * iframe with {@link mountKaplayGame} and replay it on the server with
 * {@link kaplayRun}. Both ends run the SAME scene, so the live result and the
 * server verdict agree by construction.
 *
 * Determinism rules: read input via the {@link KaplayGameApi} named actions, and
 * keep sim logic free of the wall clock and the network. Randomness is free - the
 * preset seeds KAPLAY's own RNG (`k.rand` and the api helpers) AND the host
 * `Math.random` (so KAPLAY's `shuffle` / `chooseMultiple` and raw `Math.random`
 * reproduce too), so the full engine RNG surface is deterministic both ends.
 */

// The contract surface, re-exported for one import site.
export type { Seed, Verdict, RunFn } from '@caputchin/replay-contract';

export { defineKaplayGame } from './define-game';
export { kaplayRun } from './run';
export { mountKaplayGame } from './mount';

export { encodeTrace, decodeTrace } from './trace';
export type { RecordedEvent } from './trace';

export { installKaplayShim } from './shim';
export type { KaplayShim } from './shim';
export { pumpHeadless } from './pump';
export type { PumpResult } from './pump';

export { foldSeed } from './seed';
export { FIXED_TIMESTEP_MS } from './constants';

export type {
  KaplayGame,
  KaplayGameApi,
  KaplayGameOptions,
  KaplaySceneFactory,
  MountArgs,
  Bridge,
  GameContext,
} from './types';
