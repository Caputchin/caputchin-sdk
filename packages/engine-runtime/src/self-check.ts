// The self-check — the OPTIONAL pre-publish determinism prober (ADR-0069). Since
// the platform sets no index-time determinism gate (a submitted reference trace
// is an attack surface) and runs no server-side mismatch backstop at MVP, a
// non-deterministic `run` would silently false-reject its own players on the
// server isolate. This tool is the author's confidence mechanism BEFORE publish:
// it replays the run under a hostile, isolate-equivalent environment and flags
// any dependence on ambient non-determinism — wall-clock, `Math.random`, or
// native (cross-arch-divergent) transcendental math — and any run-to-run drift.
//
// It is a LOCAL prober, not the trust anchor: the server's per-verify replay is
// authoritative, and the harness (Phase 9) adds the real-isolate diff. What this
// catches is the cheap, common class of bug — a run that reads `Date.now()` to
// seed its PRNG, calls `Math.random()`, or uses `Math.sin` (libm-approximated,
// so an ARM player and an x86 server disagree) — at author time, loud, before a
// single honest player is rejected.
//
// Limitation: it has only the `run` function reference, so it catches ambient
// access AT RUN TIME (which includes `init`, since the kit runs `init` inside
// `run`). A value captured at MODULE-LOAD time (`const T0 = Date.now()` at the
// top of the artifact) is not visible here — the `applyShim` runtime ban and the
// Phase 9 real-isolate diff cover that residual.

import { parseVerdict, type RunFn, type Seed, type Verdict } from '@caputchin/replay-contract';
import { capMath } from './math';

/** One determinism probe: a seed + the opaque trace recorded under it. */
export interface SelfCheckCase {
  readonly seed: Seed;
  readonly trace: Uint8Array | string;
  /** Optional human label for the report (defaults to `case #n`). */
  readonly label?: string;
}

export interface SelfCheckOptions {
  /** Identical re-runs used for the stability probe (default 8). */
  readonly repeats?: number;
}

/** Which determinism invariant a case violated. The `detail` always names the
 *  exact surface or symptom. */
export type ViolationKind =
  | 'unstable' // identical re-runs produced different verdicts
  | 'ambient-time' // read Date / performance (wall-clock)
  | 'ambient-random' // called Math.random / crypto (entropy)
  | 'ambient-trig' // verdict depends on native transcendentals (ARM vs x86 diverge)
  | 'ambient-other' // touched another banned surface (fetch, timers, Intl, navigator)
  | 'invalid-verdict' // run returned a value that is not a Verdict
  | 'threw'; // run threw under the clean environment (not an ambient ban)

export interface Violation {
  readonly kind: ViolationKind;
  readonly detail: string;
}

export interface CaseReport {
  readonly label: string;
  readonly deterministic: boolean;
  /** The verdict observed under the clean environment, or null if the run threw
   *  / returned a non-Verdict (see violations for which). */
  readonly verdict: Verdict | null;
  readonly violations: readonly Violation[];
}

export interface SelfCheckReport {
  /** True iff every case is deterministic. */
  readonly ok: boolean;
  readonly cases: readonly CaseReport[];
}

/** Tagged error thrown by a banned-surface probe, so the prober can name the
 *  surface the run touched rather than guessing from a generic TypeError. */
class AmbientAccess extends Error {
  constructor(readonly surface: string) {
    super(`Caputchin self-check: run accessed non-deterministic '${surface}'`);
    this.name = 'AmbientAccess';
  }
}

/** A Proxy (over a function target) that throws {@link AmbientAccess} on EVERY
 *  use shape — call (`fetch()`), construct (`new Date()`), and property read
 *  (`crypto.getRandomValues`, `performance.now`) — so a namespace global fails
 *  loud at the access site instead of as a cryptic downstream `undefined`.
 *  `typeof` still reports `'function'` (benign feature-detection survives) and
 *  symbol gets return undefined (host coercion machinery is left alone). */
function bannedProbe(surface: string): unknown {
  const fail = (): never => {
    throw new AmbientAccess(surface);
  };
  return new Proxy(function () {} as object, {
    apply: fail,
    construct: fail,
    get(_t, key) {
      if (typeof key === 'symbol') return undefined;
      return fail();
    },
  });
}

// Wall-clock / entropy / IO surfaces a deterministic run must never touch. Each
// maps to the violation axis the prober reports if the run trips it. WebAssembly,
// Atomics, and SharedArrayBuffer are deliberately NOT here: a conforming WASM run
// legitimately instantiates a module, and relaxed-SIMD is rejected at the loader,
// not via this ambient probe (it would false-flag an honest WASM run).
const BANNED: ReadonlyArray<readonly [name: string, kind: ViolationKind]> = [
  ['Date', 'ambient-time'],
  ['performance', 'ambient-time'],
  ['crypto', 'ambient-random'],
  ['fetch', 'ambient-other'],
  ['XMLHttpRequest', 'ambient-other'],
  ['WebSocket', 'ambient-other'],
  ['setTimeout', 'ambient-other'],
  ['setInterval', 'ambient-other'],
  ['setImmediate', 'ambient-other'],
  ['requestAnimationFrame', 'ambient-other'],
  ['queueMicrotask', 'ambient-other'],
  ['Intl', 'ambient-other'],
  ['navigator', 'ambient-other'],
];

// Math transcendentals that diverge across CPU arch / engine (libm-approximated).
// The cap-trig variant swaps these to the deterministic cap.math kernels; the
// trig probe diffs the two to detect a run that reads native trig.
const TRIG: readonly (keyof typeof capMath & string)[] = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'exp', 'expm1', 'log', 'log2', 'log10', 'log1p',
  'pow', 'hypot', 'cbrt', 'sinh', 'cosh', 'tanh',
];

interface Patch {
  apply(): void;
  restore(): void;
}

/** Install `value` at `globalThis[name]`, capturing the prior descriptor so it
 *  restores exactly (including a delete for a name that did not exist). */
function patchGlobal(name: string, value: unknown): Patch {
  const prior = Object.getOwnPropertyDescriptor(globalThis, name);
  const g = globalThis as Record<string, unknown>;
  return {
    apply() {
      try {
        Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
      } catch {
        /* non-configurable on this host — best effort, the diff/probe still covers it */
      }
    },
    restore() {
      try {
        if (prior) Object.defineProperty(globalThis, name, prior);
        else delete g[name];
      } catch {
        /* best effort */
      }
    },
  };
}

/** Install `value` at `Math[name]`, capturing the prior member to restore. */
function patchMath(name: string, value: unknown): Patch {
  const m = Math as unknown as Record<string, unknown>;
  const prior = m[name];
  return {
    apply() {
      m[name] = value;
    },
    restore() {
      m[name] = prior;
    },
  };
}

/** Run `fn` with every patch applied, restoring all of them afterwards (in
 *  reverse order) even if `fn` throws or rejects. The patch window spans the
 *  awaited run; the prober runs cases sequentially and must be the only code
 *  executing (it mutates shared globals), which a dev/CI invocation satisfies. */
async function withPatches<T>(patches: readonly Patch[], fn: () => T | Promise<T>): Promise<T> {
  for (const p of patches) p.apply();
  try {
    return await fn();
  } finally {
    for (let i = patches.length - 1; i >= 0; i--) patches[i]!.restore();
  }
}

/** Banned-ambient environment, optionally swapping native trig to cap.math.
 *  `Math.random` is banned in both variants (never deterministic). */
function buildEnv(capTrig: boolean): Patch[] {
  const patches: Patch[] = BANNED.map(([name]) => patchGlobal(name, bannedProbe(name)));
  patches.push(patchMath('random', bannedProbe('Math.random')));
  if (capTrig) for (const name of TRIG) patches.push(patchMath(name, capMath[name]));
  return patches;
}

function verdictsEqual(a: Verdict, b: Verdict): boolean {
  return a.passed === b.passed && a.score === b.score && a.durationMs === b.durationMs;
}

/** Invoke the run once under `patches`. Returns the parsed verdict, or an
 *  AmbientAccess (the run touched a banned surface) / other thrown error. */
async function invoke(
  run: RunFn,
  c: SelfCheckCase,
  patches: readonly Patch[],
): Promise<{ verdict: Verdict | null } | { error: unknown }> {
  try {
    const raw = await withPatches(patches, () => run(c.seed, c.trace));
    return { verdict: parseVerdict(raw) };
  } catch (error) {
    return { error };
  }
}

async function checkCase(run: RunFn, c: SelfCheckCase, repeats: number): Promise<CaseReport> {
  const label = c.label ?? 'case';
  const violations: Violation[] = [];

  // 1. Clean baseline + stability, under banned ambient + NATIVE trig (the
  //    player's default environment). Any ambient access throws an AmbientAccess
  //    tagged with the surface; any other throw is a crash under the clean env.
  const nativeEnv = buildEnv(false);
  const first = await invoke(run, c, nativeEnv);
  if ('error' in first) {
    if (first.error instanceof AmbientAccess) {
      const surface = first.error.surface;
      violations.push({ kind: axisFor(surface), detail: `run accessed '${surface}'` });
    } else {
      violations.push({ kind: 'threw', detail: String(first.error) });
    }
    return { label, deterministic: false, verdict: null, violations };
  }
  const baseline = first.verdict;
  if (baseline === null) {
    violations.push({ kind: 'invalid-verdict', detail: 'run returned a value that is not a Verdict' });
    return { label, deterministic: false, verdict: null, violations };
  }

  for (let i = 1; i < repeats; i++) {
    const again = await invoke(run, c, nativeEnv);
    if ('error' in again || again.verdict === null || !verdictsEqual(again.verdict, baseline)) {
      const got = 'error' in again ? String(again.error) : JSON.stringify(again.verdict);
      violations.push({ kind: 'unstable', detail: `re-run ${i} differed from baseline (${got} vs ${JSON.stringify(baseline)})` });
      break;
    }
  }

  // 2. Trig independence: re-run with native trig swapped to cap.math. A verdict
  //    that changes means the run reads native transcendentals (ARM/x86 diverge).
  //    A run that already uses cap.math (or no trig) is invariant — no flag.
  const capTrigResult = await invoke(run, c, buildEnv(true));
  if (!('error' in capTrigResult) && capTrigResult.verdict !== null && !verdictsEqual(capTrigResult.verdict, baseline)) {
    violations.push({
      kind: 'ambient-trig',
      detail: `verdict depends on native transcendental math (use cap.math): native ${JSON.stringify(baseline)} vs cap.math ${JSON.stringify(capTrigResult.verdict)}`,
    });
  }

  return { label, deterministic: violations.length === 0, verdict: baseline, violations };
}

function axisFor(surface: string): ViolationKind {
  const match = BANNED.find(([name]) => name === surface);
  if (match) return match[1];
  if (surface === 'Math.random') return 'ambient-random';
  return 'ambient-other';
}

/**
 * Probe a `run` for determinism over the given cases. For each case the run is
 * replayed many times under a hostile, isolate-equivalent environment; the
 * report flags any case whose verdict is unstable across re-runs or depends on
 * ambient non-determinism (wall-clock, `Math.random`/`crypto`, native trig, or
 * other banned IO surfaces). `ok` is true only when every case is deterministic.
 *
 * The run is invoked with shared globals temporarily patched, so callers MUST
 * NOT run other code concurrently with `selfCheck` (a dev/CI invocation is the
 * intended context). Cases are probed sequentially for the same reason.
 */
export async function selfCheck(
  run: RunFn,
  cases: readonly SelfCheckCase[],
  opts: SelfCheckOptions = {},
): Promise<SelfCheckReport> {
  const repeats = Math.max(2, opts.repeats ?? 8);
  const reports: CaseReport[] = [];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i]!;
    reports.push(await checkCase(run, { ...c, label: c.label ?? `case #${i + 1}` }, repeats));
  }
  return { ok: reports.every((r) => r.deterministic), cases: reports };
}
