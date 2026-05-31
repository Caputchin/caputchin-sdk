/**
 * @module engine-runtime
 *
 * Optional authoring kit for server-validated game replay. The mandatory
 * contract - `run(seed, config, trace) -> verdict` plus the {@link Seed} and
 * {@link Verdict} shapes - lives in `@caputchin/replay-contract`. This kit is
 * one convenient way to PRODUCE a conforming `run` from a pure reducer:
 * deterministic primitives ({@link cap}.rng / {@link cap}.math), an optional
 * neutralization shim ({@link applyShim}), an optional headless DOM shim
 * ({@link applyDomShim}), a fixed-step replay loop ({@link replay}), and the
 * {@link toRun} reducer-to-contract adapter. An author can ignore it entirely
 * and ship a bare conforming `run`.
 */

// Re-export the contract surface so kit consumers have one import site.
export type { Seed, Verdict, RunFn, ReplayConfig } from '@caputchin/replay-contract';
export { deriveSeed, parseVerdict, RUN_EXPORT_NAME, RUN_RPC_METHOD } from '@caputchin/replay-contract';

export { SHIM_VERSION } from './version';
export { FIXED_TIMESTEP_MS, CODEC_V } from './constants';
export { defineEngine } from './define-engine';
export { project } from './project';
export { rng, rngFromState } from './rng';
export type { Rng, RngState } from './rng';
export { capMath } from './math';
export { applyShim } from './shim';
export { applyDomShim } from './dom-shim';
export { replay } from './harness';
export { toRun } from './to-run';
export type { ToRunOptions } from './to-run';
export { encodeTrace, decodeTrace } from './trace-codec';
export { selfCheck } from './self-check';
export type {
  SelfCheckCase,
  SelfCheckOptions,
  SelfCheckReport,
  CaseReport,
  Violation,
  ViolationKind,
} from './self-check';
export type {
  Result,
  EngineSetup,
  EngineDef,
  TickInput,
  ReplayInput,
  ReplayOutcome,
} from './types';

import { capMath } from './math';
import { rng, rngFromState } from './rng';

/**
 * The author-facing toolkit, grouped for ergonomics:
 * `cap.rng(seed)` for randomness, `cap.math.sin(...)` for deterministic
 * transcendentals. (Both are also exported individually above.)
 */
export const cap = {
  rng,
  rngFromState,
  math: capMath,
} as const;
