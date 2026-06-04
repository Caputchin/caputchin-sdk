// Making a JS environment deterministic. The browser game and the server replay
// import the SAME code and run it in the SAME prepared environment, so engine
// internals (a game library's own physics/math) compute bit-for-bit identically
// in both places.
//
// Today this is the transcendental-Math swap. It is deliberately SEPARATE from
// the neutralization shim (which bans Date / Math.random / requestAnimationFrame
// / navigator / ...): a framework engine NEEDS those globals to run, so a
// framework preset swaps Math but must NOT neutralize. This module is the swap
// half; future deterministic stubs (a seeded clock, env-safe RNG) compose here
// behind `makeDeterministic`.

import { capMath } from './math';
import { mulberry32 } from './math-random';

type AnyRecord = Record<string, unknown>;

/**
 * The `Math` members that are NOT bit-identical across JS engines / CPU archs
 * and must be swapped to the deterministic {@link capMath} kernels. The
 * IEEE-754-mandated members (`sqrt` / `abs` / `floor` / `round` / `min` / `max`
 * / ...) are already deterministic and are deliberately absent.
 *
 * Exported as the single source of truth so consumers that need the same list
 * (e.g. a self-check that probes "does the verdict depend on native trig?") do
 * not re-hardcode it and drift when a kernel is added.
 */
export const SWAPPED_MATH_KEYS: ReadonlyArray<keyof typeof capMath & string> = [
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'exp',
  'expm1',
  'log',
  'log2',
  'log10',
  'log1p',
  'pow',
  'hypot',
  'cbrt',
  'sinh',
  'cosh',
  'tanh',
];

/**
 * Swap the non-deterministic `Math` transcendentals on `scope` to the
 * deterministic {@link capMath} kernels, so even code that calls `Math.sin(...)`
 * directly (a bundled game engine's own physics) is bit-identical across the
 * browser and the server. Leaves the IEEE-mandated members (`sqrt`/`abs`/`floor`
 * /...) intact. Idempotent; call once before the engine runs. Returns the names
 * it swapped (for diagnostics/tests).
 *
 * This does NOT neutralize wall-clock / entropy / IO globals; a framework engine
 * needs `requestAnimationFrame` / `performance` / `navigator` to run. Pair it
 * with a deterministic loop (fixed timestep, seeded RNG) to get full determinism.
 */
/**
 * Resolve the `Math` object a scope sees: its own `Math` if it has one, else the
 * ambient `Math`. The one audited resolution every Math-touching helper here
 * shares, so the swap and any later ban/seed all target the SAME object and the
 * rule can't drift between call sites.
 */
export function resolveMathScope(scope: object = globalThis): Record<string, unknown> {
  const g = scope as AnyRecord;
  return (g['Math'] as AnyRecord) ?? (Math as unknown as AnyRecord);
}

/**
 * Swap the non-deterministic transcendentals on an ALREADY-RESOLVED `math`
 * object (see {@link resolveMathScope}) to the {@link capMath} kernels. The
 * primitive behind {@link swapMath}; a caller that already holds the resolved
 * `math` (e.g. to also ban `Math.random` on it) uses this to avoid re-resolving.
 * Returns the names it swapped.
 */
export function swapMathInto(math: Record<string, unknown>): string[] {
  const swapped: string[] = [];
  for (const name of SWAPPED_MATH_KEYS) {
    try {
      math[name] = capMath[name] as unknown;
      swapped.push(name);
    } catch {
      // non-writable Math on this host - best effort
    }
  }
  return swapped;
}

export function swapMath(scope: object = globalThis): string[] {
  return swapMathInto(resolveMathScope(scope));
}

/**
 * Prepare `scope` to run deterministically. Currently this is {@link swapMath};
 * it is the single composition point future deterministic stubs (clock, RNG)
 * will be added to, so callers get the full environment from one call. Returns
 * the names of the globals it touched.
 */
export function makeDeterministic(scope: object = globalThis): string[] {
  return swapMath(scope);
}

/**
 * Seed the engine-visible `Math.random` PERSISTENTLY on `scope` with a small
 * deterministic PRNG (mulberry32 over the 4-word seed), so an engine that reads
 * `Math.random` directly produces the same stream live and on replay. Use this
 * for a framework that drives a fixed-step loop where seeding once per run is
 * enough — vs {@link withDeterministicEnv}, which seeds per step + restores (for
 * engines whose render-side code between steps must NOT consume the stream).
 *
 * Write-only: it overwrites `Math.random` without ever reading the existing one,
 * so it is safe under the replay self-check's banned-global probe (which throws on
 * reading `Math.random`, but a plain assignment just replaces it).
 */
export function seedRandom(seed: readonly number[], scope: typeof globalThis = globalThis): void {
  const s = ((seed[0] ?? 0) ^ (seed[1] ?? 0) ^ (seed[2] ?? 0) ^ (seed[3] ?? 0)) >>> 0;
  (scope.Math as unknown as AnyRecord).random = mulberry32(s);
}

/**
 * The seeded randomness + fixed clock a {@link withDeterministicEnv} call
 * installs for the duration of one trapped function. The caller supplies the
 * seeded stream (e.g. this kit's own {@link rng}), so the trap itself stays
 * PRNG-agnostic.
 */
export interface DeterministicEnv {
  /** Seeded replacement for `Math.random` during the trapped call. */
  readonly random: () => number;
  /** Fixed value (ms) returned by `Date.now` / `performance.now` during the call. */
  readonly nowMs: number;
}

/**
 * Run `fn` with the full deterministic environment installed, then RESTORE the
 * originals afterward (even if `fn` throws). For the duration of `fn`:
 * the transcendental `Math.*` are swapped to {@link capMath}, `Math.random` is
 * the seeded `env.random`, and `Date.now` / `performance.now` return
 * `env.nowMs`.
 *
 * This is the SCOPED, restorable counterpart to {@link makeDeterministic}: a
 * framework-as-sim preset that drives a manual fixed-step loop wraps each engine
 * `update(dt)` in this, so the bundled engine's own `Math.random` / clock reads
 * are deterministic during the step, while render-side code BETWEEN steps (live
 * play only) keeps the real globals and never consumes the seeded stream - which
 * would otherwise desync the live run from the server replay (the server only
 * consumes the stream during the step). Pass `env.nowMs = tick * fixedStepMs` so
 * the clock advances one fixed step per call.
 */
export function withDeterministicEnv<T>(env: DeterministicEnv, fn: () => T): T {
  const math = Math as unknown as AnyRecord;
  const g = globalThis as AnyRecord;
  const perf = g['performance'] as { now?: () => number } | undefined;
  const realRandom = Math.random;
  const realDateNow = Date.now;
  const realPerfNow = perf?.now;
  const savedMath: AnyRecord = {};

  for (const name of SWAPPED_MATH_KEYS) {
    savedMath[name] = math[name];
    math[name] = capMath[name] as unknown;
  }
  Math.random = env.random;
  Date.now = () => env.nowMs;
  if (perf && realPerfNow) perf.now = () => env.nowMs;

  try {
    return fn();
  } finally {
    for (const name of SWAPPED_MATH_KEYS) math[name] = savedMath[name];
    Math.random = realRandom;
    Date.now = realDateNow;
    if (perf && realPerfNow) perf.now = realPerfNow;
  }
}
