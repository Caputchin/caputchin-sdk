// Structural sanity check on decoded inputs, run by toRun BEFORE replay. Rejects
// traces malformed in ways the live driver never produces: a tick outside
// [0, maxTicks), ticks that run backwards, or more actions stamped on a single
// logical tick than any human input could generate in one fixed timestep. It is a
// cheap tamper tripwire, NOT a behavioral check; it never inspects WHAT the
// actions are, only their tick shape, so it cannot false-reject legitimate play.
// A failing trace becomes a failing verdict in toRun (never a throw).

import type { TickInput } from './types';

/**
 * Default cap on actions sharing one logical tick. Generous: a live driver drains
 * at most a frame's worth of pointer events per tick, far below this. Overridable
 * via {@link ToRunOptions.maxActionsPerTick} for an unusual input model.
 */
export const DEFAULT_MAX_ACTIONS_PER_TICK = 256;

/** Limits the structural check enforces. */
export interface TraceShapeLimits {
  /** Upper bound (exclusive) on any input's tick (mirrors the replay maxTicks). */
  readonly maxTicks: number;
  /** Max actions allowed on a single tick. */
  readonly maxActionsPerTick: number;
}

/**
 * True when `inputs` are structurally well-formed: every tick is an integer in
 * `[0, maxTicks)`, ticks are non-decreasing (the order the live driver records
 * them), and no single tick carries more than `maxActionsPerTick` actions. The
 * kit's own codec always satisfies this; a trace that violates it has been
 * hand-crafted or corrupted.
 *
 * @param inputs - Decoded tick-stamped inputs.
 * @param limits - Bounds to enforce.
 * @returns `true` if structurally valid.
 */
export function isStructurallyValid<A>(
  inputs: readonly TickInput<A>[],
  limits: TraceShapeLimits,
): boolean {
  let prevTick = -1;
  let runTick = -1;
  let runCount = 0;
  for (const e of inputs) {
    const t = e.tick;
    if (!Number.isInteger(t) || t < 0 || t >= limits.maxTicks) return false;
    if (t < prevTick) return false; // ticks must not run backwards
    prevTick = t;
    if (t === runTick) {
      runCount += 1;
      if (runCount > limits.maxActionsPerTick) return false;
    } else {
      runTick = t;
      runCount = 1;
    }
  }
  return true;
}
