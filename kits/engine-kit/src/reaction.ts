// Reaction-time floor: a shared guard games fold into their scoring so a hit that
// lands too soon after its target became actionable does NOT count. A human has a
// reaction latency (simple visual reaction is ~200ms); a bot driving the engine
// offline acts on a target the same tick it appears (frame-perfect). Refusing to
// score sub-floor hits turns the bot's perfect-information advantage into its tell.
//
// All tick math, so it is deterministic and identical live and on replay (the
// floor is a pure function of two logical ticks). The floor is deliberately
// conservative (well below human reaction) so real players never trip it; it is
// not a wall (a bot can stamp its inputs later to fake latency), but it kills the
// trivial frame-perfect solver and forces timing emulation.

import { FIXED_TIMESTEP_MS } from './constants';

/**
 * Default minimum plausible reaction latency, in milliseconds. Conservative: real
 * simple-reaction times are ~200ms, so this leaves wide human headroom while a
 * frame-perfect bot (acting in one {@link FIXED_TIMESTEP_MS} tick) is well under.
 * Tune per game by passing an explicit floor to {@link isHumanReaction}; calibrate
 * from real-session data before tightening.
 */
export const REACTION_FLOOR_MS = 100;

/**
 * Convert a reaction floor in milliseconds to whole logical ticks (rounded up, so
 * the floor is never weaker than asked). Defaults to {@link REACTION_FLOOR_MS}.
 * @param ms - Floor in milliseconds.
 * @returns Floor in ticks (`ceil(ms / FIXED_TIMESTEP_MS)`).
 */
export function reactionFloorTicks(ms: number = REACTION_FLOOR_MS): number {
  return Math.ceil(ms / FIXED_TIMESTEP_MS);
}

/**
 * Whether acting on a target at `hitTick` is a plausibly-human reaction to it
 * becoming actionable at `appearTick` (the latency is at least `floorTicks`).
 * A hit on (or before) the tick the target appeared is superhuman and should not
 * count toward score or the pass decision. Set `appearTick` to the tick the target
 * became ACTIONABLE (entered play / emerged), not merely allocated.
 *
 * @param appearTick - Logical tick the target became actionable.
 * @param hitTick - Logical tick the scoring action was applied.
 * @param floorTicks - Minimum latency in ticks (default {@link reactionFloorTicks}).
 * @returns `true` if `hitTick - appearTick >= floorTicks`.
 */
export function isHumanReaction(
  appearTick: number,
  hitTick: number,
  floorTicks: number = reactionFloorTicks(),
): boolean {
  return hitTick - appearTick >= floorTicks;
}
