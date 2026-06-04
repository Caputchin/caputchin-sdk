// The determinism prober. Replays a `run` under a hostile, isolate-equivalent
// environment and flags any dependence on ambient non-determinism - wall-clock,
// `Math.random`, native (cross-arch-divergent) transcendental math - and any
// run-to-run drift.
//
// It is the shared check used in BOTH hosts: the author/CI CLI (Node) and the
// platform's replay isolate. The banned-surface set and the trig-swap keys come
// from `@caputchin/determinism` (the SAME registry the runtime shim bans from),
// so the prober and the enforcement shim can never drift apart.
//
// It is a LOCAL prober, not the trust anchor: the server's per-verify replay is
// authoritative. What this catches is the cheap, common class of bug - a run
// that reads `Date.now()` to seed its PRNG, calls `Math.random()`, or uses
// `Math.sin` (libm-approximated, so an ARM player and an x86 server disagree).
//
// Limitation: it has only the `run` function reference, so it catches ambient
// access AT RUN TIME. A value captured at MODULE-LOAD time (`const T0 =
// Date.now()` at the top of the artifact) is not visible here - the runtime ban
// (`applyShim`) and the real-isolate diff cover that residual.

import { parseVerdict, type ReplayConfig, type RunFn, type Seed, type Verdict } from '@caputchin/replay-contract';
import { capMath, SWAPPED_MATH_KEYS, PROBE_SURFACES, bannedProxy, type AmbientKind } from '@caputchin/determinism';

/** One determinism probe: a seed + the opaque trace recorded under it, optionally
 *  under a specific server config (defaults to `null` → the run's own defaults).
 *  Generic over the run's config shape so a typed `RunFn<C>` self-checks without
 *  a cast; defaults to the opaque {@link ReplayConfig}. */
export interface SelfCheckCase<C = ReplayConfig> {
  readonly seed: Seed;
  readonly trace: Uint8Array | string;
  /** Server config the run executes under; `null`/omitted exercises the run's
   *  internal defaults (the MVP server behavior). */
  readonly config?: C | null;
  /** Optional human label for the report (defaults to `case #n`). */
  readonly label?: string;
}

/**
 * Options for {@link selfCheck}.
 */
export interface SelfCheckOptions {
  /**
   * Number of identical re-runs used for the stability probe. A higher value
   * catches flaky non-determinism more reliably at the cost of runtime.
   * Defaults to `8`; minimum enforced is `2`.
   */
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

/**
 * A single determinism violation found during {@link selfCheck}. `kind`
 * identifies which invariant failed; `detail` names the exact surface or
 * symptom for the error message.
 */
export interface Violation {
  /** Which determinism invariant the run violated. */
  readonly kind: ViolationKind;
  /** Human-readable description, naming the surface or symptom (e.g. `"run accessed 'Date'"`). */
  readonly detail: string;
}

/**
 * Self-check result for one {@link SelfCheckCase}. `deterministic` is `true`
 * only when `violations` is empty.
 */
export interface CaseReport {
  /** Human label for the case (the `label` field from {@link SelfCheckCase}, or `"case #n"`). */
  readonly label: string;
  /** `true` when the case passed all probes with no violations. */
  readonly deterministic: boolean;
  /**
   * Verdict observed under the clean environment, or `null` if the run threw
   * or returned a non-Verdict. See `violations` for which kind applied.
   */
  readonly verdict: Verdict | null;
  /** All violations found for this case. Empty when `deterministic` is `true`. */
  readonly violations: readonly Violation[];
}

/**
 * Aggregate result returned by {@link selfCheck}. `ok` is a single pass/fail
 * signal; `cases` carries the per-case detail.
 */
export interface SelfCheckReport {
  /** `true` only when every case in `cases` is deterministic (no violations). */
  readonly ok: boolean;
  /** Per-case reports, one entry per element of the `cases` input array. */
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

// The banned-surface set + the divergent-trig keys are imported from the
// determinism registry (PROBE_SURFACES / SWAPPED_MATH_KEYS), the single source
// the runtime shim also projects from. The prober's set is the WASM-safe subset
// (a conforming WASM run instantiates `WebAssembly` legitimately).

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
        /* non-configurable on this host - best effort, the diff/probe still covers it */
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
 *  executing (it mutates shared globals), which a dev/CI/admin invocation
 *  satisfies. */
async function withPatches<T>(patches: readonly Patch[], fn: () => T | Promise<T>): Promise<T> {
  for (const p of patches) p.apply();
  try {
    return await fn();
  } finally {
    for (let i = patches.length - 1; i >= 0; i--) patches[i]!.restore();
  }
}

/** A banned-surface probe that throws {@link AmbientAccess} tagged with `name`. */
function probe(name: string): unknown {
  return bannedProxy(() => {
    throw new AmbientAccess(name);
  });
}

/** Banned-ambient environment, optionally swapping native trig to cap.math.
 *  `Math.random` is banned in both variants (never deterministic). */
function buildEnv(capTrig: boolean): Patch[] {
  const patches: Patch[] = PROBE_SURFACES.map((s) => patchGlobal(s.name, probe(s.name)));
  patches.push(patchMath('random', probe('Math.random')));
  if (capTrig) for (const name of SWAPPED_MATH_KEYS) patches.push(patchMath(name, capMath[name]));
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
    const raw = await withPatches(patches, () => run(c.seed, c.config ?? null, c.trace));
    return { verdict: parseVerdict(raw) };
  } catch (error) {
    return { error };
  }
}

function axisFor(surface: string): ViolationKind {
  const match = PROBE_SURFACES.find((s) => s.name === surface);
  if (match) return match.kind as AmbientKind;
  if (surface === 'Math.random') return 'ambient-random';
  return 'ambient-other';
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
  //    A run that already uses cap.math (or no trig) is invariant - no flag.
  const capTrigResult = await invoke(run, c, buildEnv(true));
  if (!('error' in capTrigResult) && capTrigResult.verdict !== null && !verdictsEqual(capTrigResult.verdict, baseline)) {
    violations.push({
      kind: 'ambient-trig',
      detail: `verdict depends on native transcendental math (use cap.math): native ${JSON.stringify(baseline)} vs cap.math ${JSON.stringify(capTrigResult.verdict)}`,
    });
  }

  return { label, deterministic: violations.length === 0, verdict: baseline, violations };
}

/**
 * Probe a `run` for determinism over the given cases. For each case the run is
 * replayed many times under a hostile, isolate-equivalent environment; the
 * report flags any case whose verdict is unstable across re-runs or depends on
 * ambient non-determinism (wall-clock, `Math.random`/`crypto`, native trig, or
 * other banned IO surfaces). `ok` is true only when every case is deterministic.
 *
 * The run is invoked with shared globals temporarily patched, so callers MUST
 * NOT run other code concurrently with `selfCheck` (a dev/CI/admin invocation is
 * the intended context). Cases are probed sequentially for the same reason.
 */
export async function selfCheck<C = ReplayConfig>(
  run: RunFn<C>,
  cases: readonly SelfCheckCase<C>[],
  opts: SelfCheckOptions = {},
): Promise<SelfCheckReport> {
  const repeats = Math.max(2, opts.repeats ?? 8);
  // Probe the run opaquely: internally we only feed it `c.config ?? null`, so the
  // config shape is irrelevant to the prober - the public generic is purely for
  // the caller's ergonomics (a typed RunFn<C> + SelfCheckCase<C> need no cast).
  const opaqueRun = run as RunFn;
  const reports: CaseReport[] = [];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i]!;
    reports.push(await checkCase(opaqueRun, { ...c, label: c.label ?? `case #${i + 1}` }, repeats));
  }
  return { ok: reports.every((r) => r.deterministic), cases: reports };
}
