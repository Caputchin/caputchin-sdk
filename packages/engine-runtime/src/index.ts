// @caputchin/engine-runtime — the deterministic execution environment and
// engine contract for server-validated game replay (ADR-0068). Pure: no DOM,
// no registration, no widget glue. game-sdk depends on this and re-exports the
// author-facing pieces; the server replay host depends on this alone.

export { SHIM_VERSION } from './version';
export { FIXED_TIMESTEP_MS, TRACE_V } from './constants';
export { defineEngine } from './define-engine';
export { rng, rngFromState } from './rng';
export type { Rng, RngState } from './rng';
export { capMath } from './math';
export { applyShim } from './shim';
export { replay } from './harness';
export type {
  Seed,
  TraceAction,
  Trace,
  Result,
  EngineSetup,
  EngineDef,
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
