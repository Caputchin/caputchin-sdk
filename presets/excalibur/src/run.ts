// The conforming `run(seed, config, trace) -> Verdict` adapter. Decodes the opaque
// trace, replays it through the headless Excalibur pump, and returns the verdict.
// A malformed trace is a FAILED round, never a crash. A truncated replay (hit the
// tick ceiling without ending) always fails.

import type { RunFn, Seed, Verdict } from '@caputchin/replay-contract';
import { installExcaliburHeadless } from './shim.js';
import { decodeTrace } from './trace.js';
import { pumpHeadless } from './pump.js';
import type { ExcaliburGame } from './types.js';

/**
 * Build the conforming `run` from an {@link ExcaliburGame}. The game's run entry
 * does:
 *
 *   import '@caputchin/preset-excalibur/install'; // must be first
 *   import { excaliburRun } from '@caputchin/preset-excalibur';
 *   import { game } from './game.js';
 *   export const run = excaliburRun(game);
 *
 * Each `run()` re-establishes the deterministic headless env first (the replay
 * self-check prober shadows globals per call), then replays.
 */
export function excaliburRun<C = unknown>(game: ExcaliburGame): RunFn<C> {
  return async (seed: Seed, config: C | null, trace: Uint8Array | string): Promise<Verdict> => {
    installExcaliburHeadless();

    let events;
    try {
      events = decodeTrace(trace);
    } catch {
      return { passed: false, score: 0, durationMs: 0 };
    }

    const r = await pumpHeadless(game, seed, config ?? null, events);
    return { passed: r.passed && !r.truncated, score: r.score, durationMs: r.durationMs };
  };
}
