/**
 * @module @caputchin/preset-excalibur
 *
 * The on-ramp for an Excalibur.js game on the Caputchin deterministic-replay
 * platform. Self-contained: it makes Excalibur run headless (a DOM shim on the
 * 2D-canvas path + a fixed-step pump), drives determinism through a seeded RNG +
 * Excalibur's fixed update + deterministic transcendentals, and exports the
 * conforming `run`.
 *
 * Author one game with {@link defineExcaliburGame}: set up the scene (render guarded
 * by `api.headless`) and register `api.onTick` sim logic that reads input via the
 * api (pointer + named actions) and randomness via the api's seeded `rand*`. Mount
 * it live in the iframe with {@link mountExcaliburGame} and replay it on the server
 * with {@link excaliburRun}. Both ends run the SAME game over the SAME fixed-dt
 * ticks, so the live result and the server verdict agree by construction.
 *
 * The HEADLESS run entry MUST import the side-effect `@caputchin/preset-excalibur/install`
 * FIRST (before excalibur evaluates):
 *
 *   import '@caputchin/preset-excalibur/install';
 *   import { excaliburRun } from '@caputchin/preset-excalibur';
 *   import { game } from './game.js';
 *   export const run = excaliburRun(game);
 *
 * Determinism rules: read input ONLY via the api, randomness ONLY via `api.rand*`,
 * and keep sim logic free of `engine.input`, the wall clock, the network,
 * `Math.random`, and `Date`. Load is v0.1-procedural: draw with Excalibur graphics
 * primitives (no external asset files).
 */

// The contract surface, re-exported for one import site.
export type { Seed, Verdict, RunFn } from '@caputchin/replay-contract';

export { defineExcaliburGame } from './define-game';
export { excaliburRun } from './run';
export { mountExcaliburGame } from './mount';

export { encodeTrace, decodeTrace, CODEC_V } from './trace';
export type { RecordedEvent, InputEvent, PointerEvent, ActionEvent, PointerKind } from './trace';

export { installExcaliburDom, installExcaliburHeadless } from './shim';
export { pumpHeadless } from './pump';
export type { PumpResult } from './pump';

export { foldSeed } from './seed';
export { FIXED_TIMESTEP_MS, FIXED_UPDATE_FPS } from './constants';

export type {
  ExcaliburGame,
  ExcaliburGameApi,
  ExcaliburGameOptions,
  ExcaliburGameFactory,
  ApiPointer,
  ApiPointerEvent,
  MountArgs,
  Bridge,
  GameContext,
} from './types';
