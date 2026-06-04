/**
 * @module @caputchin/replay-selfcheck
 *
 * The shared replay determinism check. Given a `run(seed, config, trace) ->
 * verdict` (the `@caputchin/replay-contract` surface), it replays the run under
 * a hostile, isolate-equivalent environment and reports any non-determinism:
 * ambient access (wall-clock / `Math.random` / `crypto` / IO), native
 * transcendental dependence (ARM vs x86 diverge), run-to-run drift, a crash, or
 * a non-Verdict return.
 *
 * It is the ONE check used everywhere:
 * - the author/CI CLI (`caputchin-selfcheck`, re-exported by `@caputchin/engine-kit`),
 * - the platform's replay isolate at vendor / upload / index time (via the
 *   {@link runSelfCheck} isolate entry).
 *
 * Both always include the {@link smokeCase} (empty trace must return a Verdict,
 * not crash) - the run-level equivalent of the platform's old smoke check.
 *
 * The non-deterministic-surface set and the divergent-trig keys come from
 * `@caputchin/determinism`, the same registry the runtime ban shim projects
 * from, so check and enforcement can never drift.
 */

import type { ReplayConfig, RunFn, Seed } from '@caputchin/replay-contract';
import { selfCheck, type SelfCheckCase, type SelfCheckOptions, type SelfCheckReport } from './prober';

export { selfCheck } from './prober';
export type {
  SelfCheckCase,
  SelfCheckOptions,
  SelfCheckReport,
  CaseReport,
  Violation,
  ViolationKind,
} from './prober';

/** Two distinct seeds the convenience runner probes by default: a small one and
 *  a high-entropy one (catches a run that only misbehaves on certain words). */
export const DEFAULT_SEEDS: readonly Seed[] = [
  [1, 2, 3, 4],
  [3735928559, 2596069104, 1, 4294967295],
];

/**
 * The mandatory smoke case: seed `[0,0,0,0]` over an empty trace. A conforming
 * run must return a parseable `Verdict` here (a garbage/empty trace is a FAILED
 * round, never a crash). Both the CLI and the platform include this case in
 * every check.
 *
 * @param emptyTrace - The caller's "no inputs" trace representation. Defaults to
 *   the empty string (the platform's canonical empty trace); the reducer-lane
 *   CLI passes its codec's empty envelope (`encodeTrace([])`) so the run's own
 *   decoder accepts it.
 */
export function smokeCase(emptyTrace: string | Uint8Array = ''): SelfCheckCase {
  return { seed: [0, 0, 0, 0], trace: emptyTrace, config: null, label: '(smoke: empty trace)' };
}

/** Options for {@link selfCheckRun}. */
export interface SelfCheckRunOptions extends SelfCheckOptions {
  /** Seeds to probe (each over the empty trace). Defaults to {@link DEFAULT_SEEDS}. */
  readonly seeds?: readonly Seed[];
  /** The "no inputs" trace representation (see {@link smokeCase}). Defaults to `''`. */
  readonly emptyTrace?: string | Uint8Array;
}

/**
 * Convenience over {@link selfCheck} for callers with no recorded trace (the
 * platform at vendor / upload / index time): probes the {@link smokeCase} plus
 * each seed over the empty trace. The author CLI, which DOES have recorded
 * traces, builds its own richer case list and calls {@link selfCheck} directly.
 */
export function selfCheckRun<C = ReplayConfig>(
  run: RunFn<C>,
  opts: SelfCheckRunOptions = {},
): Promise<SelfCheckReport> {
  const seeds = opts.seeds ?? DEFAULT_SEEDS;
  const emptyTrace = opts.emptyTrace ?? '';
  const cases: SelfCheckCase<C>[] = [
    smokeCase(emptyTrace) as SelfCheckCase<C>,
    ...seeds.map((seed): SelfCheckCase<C> => ({ seed, trace: emptyTrace, config: null, label: `seed[${seed.join(',')}]` })),
  ];
  return selfCheck(run, cases, { repeats: opts.repeats });
}
