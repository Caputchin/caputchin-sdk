import { FIXED_TIMESTEP_MS } from './constants';
import type { EngineDef, ReplayInput, ReplayOutcome } from './types';

// The engine-run loop the kit uses to turn recorded inputs into an outcome. The
// SAME control flow drives live play (the SDK driver steps the engine frame by
// frame, recording inputs) and replay (this `replay` runs the recorded inputs in
// one pass) - that shared loop is what makes live score == replay score by
// construction, the basis of the kit's `toRun` adapter.
//
// Per logical tick: apply the inputs stamped at that tick (in recorded order),
// then advance exactly one fixed timestep. Stop when the engine reports
// game-over, or at `maxTicks` (a non-terminating engine is a rejectable run,
// flagged via `truncated`). Duration is derived from the tick the engine
// ACTUALLY ended on, not from any client-claimed value.

export function replay<S, A, C, V = S>(
  engine: EngineDef<S, A, C, V>,
  input: ReplayInput<A, C>,
): ReplayOutcome {
  let state = engine.init({ seed: input.seed, config: input.config });

  // Bucket inputs by their logical tick, preserving recorded order within a
  // tick (multiple inputs on one tick apply in the sequence they were recorded).
  const byTick = new Map<number, A[]>();
  for (const e of input.actions) {
    const bucket = byTick.get(e.tick);
    if (bucket) bucket.push(e.action);
    else byTick.set(e.tick, [e.action]);
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
