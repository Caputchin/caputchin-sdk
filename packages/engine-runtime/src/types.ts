// Types for the OPTIONAL engine kit. The one mandatory contract —
// `run(seed, trace) -> verdict` plus the Seed and Verdict shapes — lives in
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
 * carries; games may keep extra detail in their own state but only `score` (and
 * the harness-derived duration) feed the outcome.
 */
export interface Result {
  readonly score: number;
}

/**
 * Setup handed to `init`. `config` is the resolved gameplay configuration the
 * run executed under (e.g. pass_score, lives, gravity) — an engine input,
 * because it changes gameplay. The run is self-contained and the server does
 * not resolve config, so config is baked into the artifact (or carried in the
 * author's own trace) at the author's discretion.
 */
export interface EngineSetup<C> {
  readonly seed: Seed;
  readonly config: C;
}

/**
 * The pure reducer the kit drives. `S` = engine state (must be
 * plain-serializable), `A` = the author's action type, `C` = config shape.
 *
 * Contract:
 * - `init` builds the initial state from the seed + config. Seed the PRNG here
 *   via `cap.rng(setup.seed)` and keep it in state; never read randomness later
 *   from anywhere else.
 * - `step` applies one player action (at its logical tick).
 * - `tick` advances exactly one fixed timestep.
 * - `isOver` reports whether the game has ended.
 * - `result` reads the final score off the terminal state.
 *
 * All five MUST be pure and synchronous: no Date / Math.random / crypto / fetch
 * / DOM / async. Use `cap.rng` for randomness and `cap.math` for transcendental
 * math (the shim also swaps `Math.*`, but importing `cap.math` is clearer).
 */
export interface EngineDef<S, A = unknown, C = unknown, V = S> {
  init(setup: EngineSetup<C>): S;
  step(state: S, action: A): S;
  tick(state: S): S;
  isOver(state: S): boolean;
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
 * helper for the kit's loop + codec, generic over the author's action type — it
 * is not a "trace" the platform sees.
 */
export interface TickInput<A> {
  readonly tick: number;
  readonly action: A;
}

/** Inputs to a single replay run. */
export interface ReplayInput<A, C> {
  readonly seed: Seed;
  readonly config: C;
  readonly actions: readonly TickInput<A>[];
  /** Upper bound on ticks to run, guarding a non-terminating engine. */
  readonly maxTicks: number;
}

/** Authoritative outcome of a replay run. */
export interface ReplayOutcome {
  readonly score: number;
  readonly durationMs: number;
  /** Tick at which the engine reported game-over (or `maxTicks` if it never did). */
  readonly endTick: number;
  /** True if the engine hit `maxTicks` without ending — a rejectable run. */
  readonly truncated: boolean;
}
