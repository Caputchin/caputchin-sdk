// `kaplayRun` — adapts a KaplayGame into the mandatory `run(seed, config, trace)`
// contract from @caputchin/replay-contract. This is what the game's run entry
// re-exports and the replay isolate loads. A malformed trace yields a failing
// verdict (never a throw), so the index conformance smoke always gets a verdict.

import type { RunFn, Verdict } from '@caputchin/replay-contract';
import type { KaplayGame } from './types';
import { decodeTrace } from './trace';
import { pumpHeadless } from './pump';
import { FIXED_TIMESTEP_MS } from './constants';

/**
 * Build the conforming `run` for a {@link KaplayGame}. The returned function
 * decodes the trace, boots KAPLAY headless, replays the recorded inputs over the
 * SAME scene the browser ran, and maps the outcome to a {@link Verdict}. It is
 * async (KAPLAY's headless boot awaits its asset load); the replay host awaits it.
 *
 * @typeParam C - The game's config shape (opaque to the platform).
 */
export function kaplayRun<C = unknown>(game: KaplayGame): RunFn<C> {
  return async (seed, config, trace): Promise<Verdict> => {
    let events;
    try {
      events = decodeTrace(trace);
    } catch {
      return { passed: false, score: 0, durationMs: 0 };
    }
    const r = await pumpHeadless(game, seed, config, events);
    return {
      // A truncated (non-terminating / over-long) run is always rejected.
      passed: r.passed && !r.truncated,
      score: r.score,
      durationMs: r.ticks * FIXED_TIMESTEP_MS,
    };
  };
}
