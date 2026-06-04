// Isolate entry: the self-contained surface the platform's replay Worker bundles
// (to a single ESM string) and injects into the sealed Worker Loader isolate
// alongside the run artifact. It pulls ONLY the prober + the determinism
// primitives + the replay contract - no Node built-ins, no dynamic import, no
// wasm byte-compilation - so it loads inside the isolate's restricted runtime.
//
// The Worker's host wrapper imports `runSelfCheck` from this module and calls it
// with the artifact's `run`, then returns the report over RPC. Determinism is
// probed with synthetic seeds + the empty trace (the platform has no recorded
// play at vendor/upload/index time), which is exactly what `selfCheckRun` does.

import { selfCheckRun, type SelfCheckRunOptions } from './index';
import type { ReplayConfig, RunFn } from '@caputchin/replay-contract';
import type { SelfCheckReport } from './prober';

export type { SelfCheckReport } from './prober';
export type { SelfCheckRunOptions } from './index';

/**
 * Probe `run` for determinism inside the replay isolate. Thin alias over
 * {@link selfCheckRun} under a name that reads clearly at the Worker host-wrapper
 * call site. Returns the aggregate {@link SelfCheckReport}; `report.ok` is the
 * gate signal the platform stores as `selfCheckOk`.
 */
export function runSelfCheck<C = ReplayConfig>(
  run: RunFn<C>,
  opts: SelfCheckRunOptions = {},
): Promise<SelfCheckReport> {
  return selfCheckRun(run, opts);
}
