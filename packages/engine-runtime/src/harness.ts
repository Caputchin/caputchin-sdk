import { FIXED_TIMESTEP_MS } from './constants';
import type { EngineDef, ReplayInput, ReplayOutcome } from './types';

// The engine-run loop. The SAME control flow drives live play (the SDK driver
// steps the engine frame by frame and records actions) and server replay (this
// `replay` runs the recorded actions in one pass) — that shared loop is what
// makes live score == replay score by construction (ADR-0068).
//
// Per logical tick: apply the actions stamped at that tick (in recorded order),
// then advance exactly one fixed timestep. Stop when the engine reports
// game-over, or at `maxTicks` (a non-terminating engine is a rejectable trace,
// flagged via `truncated`). Duration is derived from the tick the engine
// ACTUALLY ended on, not from any client-claimed value.

export function replay<S, A, C>(
  engine: EngineDef<S, A, C>,
  input: ReplayInput<C>,
): ReplayOutcome {
  let state = engine.init({ seed: input.seed, config: input.config });

  // Bucket actions by their logical tick, preserving recorded order within a
  // tick (multiple actions on one tick apply in the sequence they were recorded).
  const byTick = new Map<number, A[]>();
  for (const a of input.actions) {
    const action = { kind: a.kind, data: a.data } as unknown as A;
    const bucket = byTick.get(a.tick);
    if (bucket) bucket.push(action);
    else byTick.set(a.tick, [action]);
  }

  let tick = 0;
  let truncated = false;
  while (!engine.isOver(state)) {
    if (tick >= input.maxTicks) {
      truncated = true;
      break;
    }
    const acts = byTick.get(tick);
    if (acts) {
      for (let i = 0; i < acts.length; i++) state = engine.step(state, acts[i]);
    }
    state = engine.tick(state);
    tick++;
  }

  const endTick = tick;
  const { score } = engine.result(state);
  return {
    score,
    durationMs: endTick * FIXED_TIMESTEP_MS,
    endTick,
    truncated,
  };
}
