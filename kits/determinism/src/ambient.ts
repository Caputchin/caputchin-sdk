// The canonical registry of non-deterministic ambient surfaces, plus the shared
// Proxy that stands in for a removed one. This is the single source of truth the
// two consumers project from, so they can never drift:
//
//   - `applyShim` (this kit, the strict JS lane) bans EVERY surface — a pure-JS
//     reducer author controls all their own code and touches none of these.
//   - the replay self-check prober (`@caputchin/replay-selfcheck`) bans the
//     PROBE subset — it must NOT false-flag a CONFORMING WASM run, which
//     legitimately instantiates `WebAssembly` (and may touch `Atomics` /
//     `SharedArrayBuffer`). Those carry `probe: false`.
//
// Historically these were two hand-maintained lists (the shim's `NEUTRALIZE` and
// the prober's `BANNED`) that diverged silently; folding them here kills that.

/** Which determinism axis a surface violates, for the prober's report. The
 *  transcendental-trig axis is handled by the Math swap, not this registry. */
export type AmbientKind = 'ambient-time' | 'ambient-random' | 'ambient-other';

/** One non-deterministic global surface. `probe` marks membership in the
 *  prober's set (vs shim-only); see the module note for the WASM rationale. */
export interface AmbientSurface {
  /** The global name (e.g. `'Date'`, `'fetch'`). */
  readonly name: string;
  /** The determinism axis it violates if touched. */
  readonly kind: AmbientKind;
  /** `true` if the prober bans it too; `false` for shim-only surfaces a
   *  conforming WASM run legitimately uses (`WebAssembly`/`Atomics`/
   *  `SharedArrayBuffer`) or benign teardown pairs not worth probing. */
  readonly probe: boolean;
}

// Each surface is a source of wall-clock / entropy / IO, or an
// environment-dependent value that differs between the player's device and the
// server isolate and would silently desync a replay:
//   - Intl: locale/timezone-dependent (server TZ != player TZ).
//   - navigator: hardwareConcurrency / language / userAgent differ per device.
//   - WebAssembly: relaxed-SIMD results are non-deterministic by spec.
//   - Atomics / SharedArrayBuffer: thread-timing-observable.
// The first block is probed too; the second is shim-only (`probe: false`).
export const AMBIENT_SURFACES: readonly AmbientSurface[] = [
  { name: 'Date', kind: 'ambient-time', probe: true },
  { name: 'performance', kind: 'ambient-time', probe: true },
  { name: 'crypto', kind: 'ambient-random', probe: true },
  { name: 'fetch', kind: 'ambient-other', probe: true },
  { name: 'XMLHttpRequest', kind: 'ambient-other', probe: true },
  { name: 'WebSocket', kind: 'ambient-other', probe: true },
  { name: 'setTimeout', kind: 'ambient-other', probe: true },
  { name: 'setInterval', kind: 'ambient-other', probe: true },
  { name: 'setImmediate', kind: 'ambient-other', probe: true },
  { name: 'requestAnimationFrame', kind: 'ambient-other', probe: true },
  { name: 'queueMicrotask', kind: 'ambient-other', probe: true },
  { name: 'Intl', kind: 'ambient-other', probe: true },
  { name: 'navigator', kind: 'ambient-other', probe: true },
  // Shim-only (banned for the strict JS lane; NOT probed — a conforming WASM run
  // uses WebAssembly/Atomics/SharedArrayBuffer, and the clear*/cancel* teardown
  // pairs + GC-observers are not worth a probe false-positive).
  { name: 'clearTimeout', kind: 'ambient-other', probe: false },
  { name: 'clearInterval', kind: 'ambient-other', probe: false },
  { name: 'cancelAnimationFrame', kind: 'ambient-other', probe: false },
  { name: 'WeakRef', kind: 'ambient-other', probe: false },
  { name: 'FinalizationRegistry', kind: 'ambient-other', probe: false },
  { name: 'WebAssembly', kind: 'ambient-other', probe: false },
  { name: 'Atomics', kind: 'ambient-other', probe: false },
  { name: 'SharedArrayBuffer', kind: 'ambient-other', probe: false },
];

/** Every surface name — the shim's ban set. */
export const BAN_ALL_SURFACES: readonly string[] = AMBIENT_SURFACES.map((s) => s.name);

/** The prober's subset (name + axis), excluding WASM-legitimate surfaces. */
export const PROBE_SURFACES: readonly AmbientSurface[] = AMBIENT_SURFACES.filter((s) => s.probe);

/**
 * Build the value that replaces a banned global: a Proxy (over a function
 * target) so it fails LOUD on every use shape — calling it (`fetch()`),
 * constructing it (`new Date()`), AND reading any property
 * (`crypto.getRandomValues`, `Intl.DateTimeFormat`, `navigator.language`) — the
 * last is why a plain throwing function is not enough for namespace globals,
 * where method access would otherwise be a cryptic `undefined is not a
 * function`. `typeof` still reports `'function'` so benign feature-detection
 * doesn't trip; symbol reads return `undefined` so host coercion machinery is
 * left alone.
 *
 * The thrown value is the caller's: the shim throws a human-readable Error, the
 * prober throws a tagged error it uses to name the touched surface — so the
 * Proxy mechanics are shared but each consumer keeps its own failure signal.
 *
 * @param fail - Invoked on every access; must throw (its return type is `never`).
 */
export function bannedProxy(fail: () => never): unknown {
  return new Proxy(function () {} as object, {
    apply: fail,
    construct: fail,
    get(_t, key) {
      if (typeof key === 'symbol') return undefined;
      return fail();
    },
  });
}
