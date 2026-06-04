// Types for the OPTIONAL engine kit. The one mandatory contract -
// `run(seed, trace) -> verdict` plus the Seed and Verdict shapes - lives in
// `@caputchin/replay-contract`; this kit is one convenient way to PRODUCE a
// conforming `run` from a pure reducer, never a contract authors must adopt.
//
// There is deliberately NO trace type here. The trace is opaque to the platform
// (bytes or a string); how the kit serializes recorded inputs is the kit's
// private codec (see trace-codec.ts), not an exported contract.
//
// Determinism is still the whole point: identical (seed, config, recorded
// inputs) MUST produce an identical outcome live and on replay, so every type
// here is plain-JSON-serializable (it crosses a worker boundary) and nothing
// carries a function or a reference to wall-clock / DOM / IO.

// The per-round seed is owned by the contract package; re-exported so kit
// modules (and kit consumers) can import it from one place.
export type { Seed } from '@caputchin/replay-contract';
import type { Seed } from '@caputchin/replay-contract';

/**
 * What the engine reports when the game ends. `score` is the value the verdict
 * carries; `passed` is the engine's OWN pass/fail decision, read from the
 * terminal state (e.g. a goal reached, or a threshold the resolved config set).
 * Pass lives HERE, beside the state it judges, so the headless replay and the
 * live game share one decision site - never an external gate that one path can
 * compute differently.
 */
export interface Result {
  /** Game-defined final score. Any finite number; not bounded by the platform. */
  readonly score: number;
  /**
   * The engine's own pass decision from the terminal state (e.g. a score
   * threshold or goal reached). `toRun` ANDs this with the non-truncated
   * guard before emitting the {@link Verdict}.
   */
  readonly passed: boolean;
}

/**
 * Setup handed to `init`. `config` is the RAW, server-resolved gameplay config
 * (the per-site dashboard config), opaque to the platform and possibly `null`
 * (no config supplied). `init` is the SINGLE place that raw config is
 * transformed into the engine's internal sim parameters - including resolving
 * `null` to the engine's own defaults - so the live game and the headless
 * replay, both calling `init` with the same raw config, cannot diverge.
 */
export interface EngineSetup<C> {
  /** Server-derived per-round seed. Seed your PRNG here via `cap.rng(setup.seed)` and store it in state. */
  readonly seed: Seed;
  /**
   * Raw server-resolved gameplay config, or `null` when no config is
   * configured for the site key. `init` is responsible for resolving `null`
   * to the engine's own defaults.
   */
  readonly config: C | null;
}

/**
 * The pure reducer the kit drives. `S` = engine state (must be
 * plain-serializable), `A` = the author's action type, `C` = config shape.
 *
 * Contract:
 * - `init` resolves the RAW config (`null` -> the engine's defaults) into its
 *   internal sim parameters and builds the initial state from the seed. Seed the
 *   PRNG here via `cap.rng(setup.seed)` and keep it in state; never read
 *   randomness later from anywhere else.
 * - `step` applies one player action (at its logical tick).
 * - `tick` advances exactly one fixed timestep.
 * - `isOver` reports whether the game has ended.
 * - `result` reads the final score AND the pass decision off the terminal state.
 *
 * All five MUST be pure and synchronous: no Date / Math.random / crypto / fetch
 * / DOM / async. Use `cap.rng` for randomness and `cap.math` for transcendental
 * math (the shim also swaps `Math.*`, but importing `cap.math` is clearer).
 */
export interface EngineDef<S, A = unknown, C = unknown, V = S> {
  /**
   * Build the initial engine state from `setup.seed` and `setup.config`.
   * This is the ONLY place raw config is resolved to sim parameters; call
   * `cap.rng(setup.seed)` here and keep the `Rng` in state.
   */
  init(setup: EngineSetup<C>): S;
  /**
   * Apply one player action at its logical tick. Must be pure and synchronous.
   * @param state - Current engine state.
   * @param action - Player action to apply.
   */
  step(state: S, action: A): S;
  /**
   * Advance the simulation by exactly one fixed timestep (`FIXED_TIMESTEP_MS`).
   * Must be pure and synchronous.
   * @param state - Current engine state.
   */
  tick(state: S): S;
  /**
   * Returns `true` when the game has ended and the replay loop should stop.
   * @param state - Current engine state.
   */
  isOver(state: S): boolean;
  /**
   * Read the final score and pass decision from the terminal state. Called
   * once after {@link isOver} returns `true`. Must be pure.
   * @param state - Terminal engine state.
   */
  result(state: S): Result;
  /**
   * OPTIONAL render projection. The live driver hands the renderer the result
   * of `view(state)` each tick if defined, otherwise the full state `S`. Provide
   * it to keep engine internals (the PRNG state, AI bookkeeping, spatial
   * indexes) out of what crosses the worker boundary and reaches the DOM layer;
   * omit it and the renderer receives the whole state. Pure and synchronous like
   * the rest of the contract; it never feeds replay (the server runs
   * `init/step/tick/result` only), so it cannot affect the verdict.
   */
  view?(state: S): V;
}

/**
 * One recorded input the replay loop applies: the author's `action`, stamped
 * with the LOGICAL tick it lands on (never wall-clock). This is a structural
 * helper for the kit's loop + codec, generic over the author's action type - it
 * is not a "trace" the platform sees.
 */
export interface TickInput<A> {
  /** Logical tick index at which this action lands. Zero-based, matching the loop counter in {@link replay}. */
  readonly tick: number;
  /** The player action to pass to `engine.step` at this tick. */
  readonly action: A;
}

/** Inputs to a single replay run. */
export interface ReplayInput<A, C> {
  /** Per-round seed the engine's `init` receives to initialize its PRNG and starting state. */
  readonly seed: Seed;
  /** Server-resolved gameplay config passed straight to `init`. `null` means use the engine's own defaults. */
  readonly config: C | null;
  /** Tick-stamped player inputs to apply during replay, in recorded order. */
  readonly actions: readonly TickInput<A>[];
  /** Maximum ticks before the loop stops and marks the run as {@link ReplayOutcome.truncated}. Guards against a non-terminating engine. */
  readonly maxTicks: number;
}

/** Authoritative outcome of a replay run produced by {@link replay}. */
export interface ReplayOutcome {
  /** Final score read from the engine's terminal state via `engine.result`. */
  readonly score: number;
  /** The engine's own pass decision from the terminal state (before the `truncated` guard is ANDed in). */
  readonly passed: boolean;
  /** Play duration in milliseconds, derived as `endTick * FIXED_TIMESTEP_MS`. */
  readonly durationMs: number;
  /** Tick at which the engine reported game-over, or `maxTicks` if it never terminated. */
  readonly endTick: number;
  /** `true` if the engine reached `maxTicks` without reporting game-over. A truncated run is always rejectable. */
  readonly truncated: boolean;
}
