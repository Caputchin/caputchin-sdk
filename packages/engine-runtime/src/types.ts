// Core contract types for server-validated game replay (ADR-0068).
//
// The engine is a pure, synchronous reducer the SDK driver runs live in the
// browser and the platform re-runs on the server. Determinism is the whole
// point: identical (seed, config, actions) MUST produce an identical result in
// both places, so every type here is plain-JSON-serializable (it crosses a
// Web Worker / Worker-Loader boundary) and nothing carries a function or a
// reference to wall-clock / DOM / IO.

/**
 * The engine seed: the low 128 bits of `SHA-256(sessionId + ":" + gameId)`,
 * delivered as four unsigned 32-bit words (most-significant word first). Fixed
 * width so it slices cleanly into the PRNG state, and derived server-side at
 * replay time, so it never depends on the gameNonce wire format.
 */
export type Seed = readonly [number, number, number, number];

/**
 * One recorded player action, stamped by the driver with the LOGICAL tick it
 * lands on (never wall-clock). `kind` and `data` are game-defined and opaque to
 * the runtime; `data` must be JSON-serializable.
 */
export interface TraceAction {
  /** Logical tick index the action was applied at. */
  readonly tick: number;
  /** Game-defined action discriminant. */
  readonly kind: string;
  /** Game-defined, JSON-serializable payload. */
  readonly data?: unknown;
}

/**
 * The trace envelope the runtime owns. The action payload is the game's; the
 * envelope is ours. `seed` is echoed for self-containment. `shimVersion` is the
 * `@caputchin/engine-runtime` version the trace was produced under, so the
 * server can replay through the matching deterministic environment (see
 * SHIM_VERSION). Game `config` is NOT carried here — the server resolves it
 * from the session and never trusts a client-sent config.
 */
export interface Trace {
  /** Trace envelope schema version. */
  readonly v: number;
  /** engine-runtime version the trace was produced under. */
  readonly shimVersion: string;
  readonly seed: Seed;
  readonly actions: readonly TraceAction[];
  /** Logical tick at which play ended (game-over). */
  readonly endTick: number;
}

/**
 * What the engine reports when the game ends. `score` is the canonical value
 * the server treats as authoritative; games may attach extra read-only detail
 * but only `score` (and the harness-derived duration) feed the verdict.
 */
export interface Result {
  readonly score: number;
}

/**
 * Setup handed to `init`. `config` is the resolved customer game configuration
 * (e.g. pass_score, lives, gravity) the run executed under — an engine input,
 * because it changes gameplay. It is server-resolved at replay time, not taken
 * from the trace.
 */
export interface EngineSetup<C> {
  readonly seed: Seed;
  readonly config: C;
}

/**
 * The pure reducer a game exports as its engine. `S` = engine state (must be
 * plain-serializable), `A` = action payload type, `C` = config shape.
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
export interface EngineDef<S, A = unknown, C = unknown> {
  init(setup: EngineSetup<C>): S;
  step(state: S, action: A): S;
  tick(state: S): S;
  isOver(state: S): boolean;
  result(state: S): Result;
}

/** Inputs to a single replay run. */
export interface ReplayInput<C> {
  readonly seed: Seed;
  readonly config: C;
  readonly actions: readonly TraceAction[];
  /** Upper bound on ticks to run, guarding a non-terminating engine. */
  readonly maxTicks: number;
}

/** Authoritative outcome of a replay run. */
export interface ReplayOutcome {
  readonly score: number;
  readonly durationMs: number;
  /** Tick at which the engine reported game-over (or `maxTicks` if it never did). */
  readonly endTick: number;
  /** True if the engine hit `maxTicks` without ending — a rejectable trace. */
  readonly truncated: boolean;
}
