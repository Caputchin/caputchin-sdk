// defineMelonGame - the melonJS framework-as-sim adapter. Unlike a hand-rolled
// reducer, this drives the REAL melonJS engine: a me.Application with me.Body
// physics + collision, advanced by `world.update` at a FIXED dt under the
// determinism trap. The author writes a normal melonJS game (sprites, bodies,
// velocities, collision response); the preset makes it bit-reproducible on the
// server replay. The SAME spec runs the browser round (see `mountMelonGame`) and
// the server replay, so the live outcome equals the replayed verdict.
//
// Determinism is enforced here (per-engine, safety-critical, code not prose):
// every `world.update` runs inside `withDeterministicEnv`, which feeds melonJS a
// seeded `Math.random`, a fixed tick-clock, and capMath transcendentals. The
// trap draws from its OWN seed-derived stream, independent of the game's
// `api.rng`. The headless DOM shim is applied only when there is no real DOM.

import type { EngineDef, Result } from '@caputchin/engine-kit';
import { defineEngine, FIXED_TIMESTEP_MS } from '@caputchin/engine-kit';
import type { Seed } from '@caputchin/replay-contract';
import type * as MelonJS from 'melonjs';
import { applyHeadlessDom, freezeClock, withDeterministicEnv, rng, makeDeterministic, sealHeadlessAmbient } from '@caputchin/determinism';

/** The melonJS module namespace (`import * as me from 'melonjs'`). */
export type MelonNamespace = typeof MelonJS;
/** A booted melonJS Application instance (carries `.world`, the camera, the renderer). */
export type MelonApplication = InstanceType<MelonNamespace['Application']>;

/** Per-round context handed to every spec method. */
export interface MelonGameApi<C> {
  /** The consumer-provided melonJS namespace. */
  readonly me: MelonNamespace;
  /** The booted Application; build your scene into `app.world`. */
  readonly app: MelonApplication;
  /** Server-derived per-round seed. */
  readonly seed: Seed;
  /** Raw server-resolved config, or `null` (resolve `null` to defaults in `setup`). */
  readonly config: C | null;
  /** Game randomness - a seeded stream INDEPENDENT of the engine-internal trap. */
  readonly rng: () => number;
  /** Scratch for non-serializable refs (entities, the Stage); persists per round. */
  readonly ctx: Record<string, unknown>;
}

/**
 * A melonJS game using the full engine. The preset builds the Application and
 * drives `world.update`; the author owns the scene + reads the verdict.
 */
export interface MelonGameSpec<S, A = unknown, C = unknown, V = S> {
  /** The melonJS namespace. */
  readonly me: MelonNamespace;
  /** Design resolution (world units). */
  readonly width: number;
  readonly height: number;
  /** Build the physics scene into `api.app.world`; seed from `api.seed`, resolve
   *  `api.config`; return serializable game state `S` (stash live refs in `api.ctx`). */
  setup(api: MelonGameApi<C>): S;
  /** Apply one player action at its logical tick. */
  input(state: S, action: A, api: MelonGameApi<C>): S;
  /** Called once per fixed step, AFTER the trap-wrapped `world.update`; read the
   *  engine state (positions, collisions, score) back into serializable `S`. */
  afterStep(state: S, api: MelonGameApi<C>): S;
  /** True when the round has ended. */
  isOver(state: S): boolean;
  /** Final score + the engine's own pass decision. */
  result(state: S): Result;
  /** Optional render projection (live renderer reads it; never replayed). */
  view?(state: S): V;
}

// Independent second stream for the trap (seed perturbation): the engine-internal
// Math.random draws never shift the game's own rng.
function perturbSeed(seed: Seed): Seed {
  return [
    (seed[0] ^ 0x9e3779b9) >>> 0,
    (seed[1] ^ 0x85ebca6b) >>> 0,
    (seed[2] ^ 0xc2b2ae35) >>> 0,
    (seed[3] ^ 0x27d4eb2f) >>> 0,
  ] as unknown as Seed;
}

/** Create the per-round driver state shared by the headless engine and the live
 *  mount: builds the Application, seeds rng, and exposes the fixed-step advance. */
export interface MelonDriver<S, A, C> {
  readonly api: MelonGameApi<C>;
  /** Apply a recorded/live action. */
  step(state: S, action: A): S;
  /** Advance exactly one fixed timestep: trap-wrapped `world.update` + `afterStep`. */
  tick(state: S): S;
}

export function createMelonDriver<S, A, C, V>(
  spec: MelonGameSpec<S, A, C, V>,
  app: MelonApplication,
  setup: { seed: Seed; config: C | null },
): { driver: MelonDriver<S, A, C>; state: S } {
  const game = rng(setup.seed);
  const trap = rng(perturbSeed(setup.seed));
  let t = 0;
  const api: MelonGameApi<C> = {
    me: spec.me,
    app,
    seed: setup.seed,
    config: setup.config,
    rng: () => game.next(),
    ctx: {},
  };
  const initial = spec.setup(api);
  const driver: MelonDriver<S, A, C> = {
    api,
    step(state, action) {
      return spec.input(state, action, api);
    },
    tick(state) {
      const tick = t;
      t += 1;
      withDeterministicEnv({ random: () => trap.next(), nowMs: tick * FIXED_TIMESTEP_MS }, () => {
        (app.world as unknown as { update(dt: number): void }).update(FIXED_TIMESTEP_MS);
      });
      return spec.afterStep(state, api);
    },
  };
  return { driver, state: initial };
}

/**
 * Adapt a {@link MelonGameSpec} into an engine-kit {@link EngineDef} for the
 * HEADLESS replay path. Pair with `toRun`:
 *
 * ```ts
 * import * as me from 'melonjs';
 * import { toRun } from '@caputchin/engine-kit';
 * import { defineMelonGame } from '@caputchin/preset-melonjs';
 * export const run = toRun(defineMelonGame({ me, width, height, setup, input, afterStep, isOver, result }), { maxTicks });
 * ```
 *
 * The init boots a headless `me.Application` (CANVAS renderer, no GL), installs
 * the DOM shim if there is no real DOM, and drives `world.update` under the trap.
 * One active round per engine instance.
 */
export function defineMelonGame<S, A = unknown, C = unknown, V = S>(
  spec: MelonGameSpec<S, A, C, V>,
): EngineDef<S, A, C, V> {
  let driver: MelonDriver<S, A, C> | null = null;

  return defineEngine<S, A, C, V>({
    init(setup) {
      // Headless only (the replay isolate): prepare the deterministic no-DOM boot
      // env. Guarded on a run-time absence of `document` so it fires in the isolate
      // (and the selfcheck CLI) but NOT in the browser or a DOM test runner - and
      // it runs HERE, in init(), not at module load, because a test runner attaches
      // its DOM only after the module graph evaluates, so the guard is only reliable
      // at run() time. The per-step trap (withDeterministicEnv, in `tick`) handles
      // the clock + randomness during each world.update on both ends.
      //   - makeDeterministic: swap the transcendental Math kernels (so boot-time
      //     trig is capMath, matching the per-tick trap and the live `/live` swap).
      //   - applyHeadlessDom + freezeClock: stub the DOM + freeze the clock.
      //   - sealHeadlessAmbient: lock the clock + scheduler NON-CONFIGURABLE so the
      //     self-check / replay-isolate run-time ambient ban can't shadow them when
      //     melonjs's game-loop constructor reads them. (Math.random's eval-time
      //     core-js read is handled earlier, by `@caputchin/preset-melonjs/install`.)
      if (typeof (globalThis as { document?: unknown }).document === 'undefined') {
        makeDeterministic(globalThis);
        applyHeadlessDom(globalThis);
        freezeClock(globalThis, 0);
        sealHeadlessAmbient(globalThis);
      }
      const AppCtor = spec.me.Application as unknown as new (
        w: number,
        h: number,
        opts: Record<string, unknown>,
      ) => MelonApplication;
      const app = new AppCtor(spec.width, spec.height, {
        renderer: (spec.me.video as unknown as { CANVAS: number }).CANVAS,
      });
      const built = createMelonDriver(spec, app, { seed: setup.seed, config: setup.config });
      driver = built.driver;
      return built.state;
    },
    step(state, action) {
      return (driver as MelonDriver<S, A, C>).step(state, action);
    },
    tick(state) {
      return (driver as MelonDriver<S, A, C>).tick(state);
    },
    isOver: spec.isOver,
    result: spec.result,
    view: spec.view,
  });
}
