/**
 * @module shim
 *
 * Neutralization shim for the IEEE-754 + JS engine path. Apply once at the
 * top of the engine's execution scope via {@link applyShim} to make the
 * environment determinism-safe for both live play and server replay.
 */

// The neutralization shim - an OPTIONAL kit helper for the IEEE-754 + JS path.
// Run once at the top of the engine's execution scope; applying the
// SAME shim live and on replay keeps those two environments from drifting via a
// stray non-deterministic global. It is optional: a fixed-point or WASM author
// never needs it, and a bare conforming `run` may skip it entirely.
//
// It does two things:
//   1. Swaps `Math.*` transcendentals to point at `cap.math`, so even engine
//      code that calls `Math.sin` (rather than importing cap.math) is
//      deterministic. The IEEE-mandated members (`sqrt`/`abs`/`floor`/…) are
//      left alone - they are already bit-identical.
//   2. Replaces every non-deterministic global (`Date`, `Math.random`,
//      `crypto`, `fetch`, timers, GC observers, …) with a loud thrower, so any
//      accidental use fails immediately and visibly instead of silently making
//      a run un-replayable.
//
// This is a runtime safety net, not the trust anchor: determinism is the
// author's burden (the platform sets no index-time gate), the optional self-check
// tool catches drift before publish, and the server's per-verify replay is
// authoritative. The shim makes the failure mode "throws on first use" rather
// than "passes locally, diverges on the server".

import { capMath } from './math';

type AnyRecord = Record<string, unknown>;

/** A thrower installed in place of a banned global. */
function banned(name: string): never {
  throw new Error(
    `${name} is not available inside a Caputchin engine: it is non-deterministic. ` +
      `Use cap.rng for randomness, logical ticks for time, and cap.math for transcendentals.`,
  );
}

/**
 * Build the value that replaces a banned global. A Proxy (over a function
 * target) so it fails LOUD on every use shape: calling it (`Date()`),
 * constructing it (`new Date()`), AND reading any property
 * (`crypto.getRandomValues`, `Intl.DateTimeFormat`, `navigator.language`) - the
 * last is why a plain throwing function is not enough for namespace globals,
 * where method access would otherwise be a cryptic `undefined is not a
 * function`. `typeof` still reports `'function'` so benign feature-detection
 * doesn't trip; symbol gets return undefined so host coercion machinery is left
 * alone.
 */
function makeBanned(name: string): unknown {
  const fail = (): never => banned(name);
  return new Proxy(function () {} as object, {
    apply: fail,
    construct: fail,
    get(_t, key) {
      if (typeof key === 'symbol') return undefined;
      return fail();
    },
  });
}

// Math members that are NOT deterministic across engines and must be swapped
// to the cap.math equivalents.
const SWAP: ReadonlyArray<keyof typeof capMath & string> = [
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

// Globals removed entirely (replaced with the loud Proxy). Each is either a
// source of wall-clock / entropy / IO, or an environment-dependent surface
// whose value differs between the player's device and the server isolate and
// would silently desync a replay:
//   - Intl: locale/timezone-dependent (server TZ != player TZ).
//   - navigator: hardwareConcurrency / language / userAgent differ per device.
//   - WebAssembly: relaxed-SIMD results are non-deterministic by spec.
//   - Atomics / SharedArrayBuffer: thread-timing-observable.
// These last ones would otherwise slip past the author silently and only surface
// as a replay mismatch; the shim's job is to fail loud at author time instead.
const NEUTRALIZE: readonly string[] = [
  'Date',
  'performance',
  'crypto',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'WeakRef',
  'FinalizationRegistry',
  'Intl',
  'navigator',
  'WebAssembly',
  'Atomics',
  'SharedArrayBuffer',
];

/**
 * Apply the deterministic environment to the current global scope. Idempotent;
 * call once before importing/running the engine. Returns the list of names it
 * neutralized (for diagnostics/tests).
 */
export function applyShim(scope: object = globalThis): string[] {
  const g = scope as AnyRecord;
  const neutralized: string[] = [];

  // 1. swap Math transcendentals → cap.math (leave sqrt/abs/floor/… intact)
  const math = (g['Math'] as AnyRecord) ?? (Math as unknown as AnyRecord);
  for (const name of SWAP) {
    try {
      math[name] = capMath[name] as unknown;
    } catch {
      // non-writable in some host - best effort; the lint + probe still cover it
    }
  }
  // Math.random is the one Math member to ban outright rather than swap.
  try {
    math['random'] = makeBanned('Math.random');
  } catch {
    /* best effort */
  }

  // 2. neutralize non-deterministic globals
  for (const name of NEUTRALIZE) {
    try {
      g[name] = makeBanned(name);
      neutralized.push(name);
    } catch {
      // non-configurable global on this host - best effort
    }
  }

  return neutralized;
}
