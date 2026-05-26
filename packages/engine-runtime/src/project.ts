import type { EngineDef } from './types';

/**
 * What the live driver sends to the factory's `onState` each tick: the engine's
 * `view(state)` projection when it defines one, otherwise the full state. This
 * is a LIVE-render concern only — replay (`harness.replay`) never calls it, so
 * `view` cannot influence the authoritative verdict. Centralized here so the
 * "view-or-full-state" rule lives in one place the driver imports.
 */
export function project<S, A, C, V>(engine: EngineDef<S, A, C, V>, state: S): S | V {
  return engine.view ? engine.view(state) : state;
}
