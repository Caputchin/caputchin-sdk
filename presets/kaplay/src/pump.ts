// The headless driver: boot KAPLAY under the shim (which also makes Math
// deterministic) and pump its loop one fixed-dt frame at a time over the recorded
// events until the round ends. Same Session + same per-frame stepping the live
// driver uses, just paced as-fast-as-possible instead of to wall-clock - so the
// replay reproduces live play.

import kaplay from 'kaplay';
import type { KAPLAYCtx } from 'kaplay';
import type { Seed } from '@caputchin/replay-contract';
import type { GameContext, KaplayGame } from './types';
import { installKaplayShim } from './shim';
import { createSession } from './session';
import type { SceneOutcome } from './scene';
import { TraceSource } from './source';
import type { RecordedEvent } from './trace';
import { DRAIN_TICKS, MAX_LOAD_FRAMES } from './constants';

// A macrotask drain: guarantees the microtask queue (KAPLAY's async asset-load
// chain) fully settles before the next frame, exactly as the spike proved.
const nextTask = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

export interface PumpResult extends SceneOutcome {
  readonly truncated: boolean;
}

export async function pumpHeadless(
  game: KaplayGame,
  seed: Seed,
  config: unknown,
  events: readonly RecordedEvent[],
): Promise<PumpResult> {
  const shim = installKaplayShim();
  try {
    const k: KAPLAYCtx = kaplay({
      ...game.options.kaplay,
      canvas: shim.canvas as unknown as HTMLCanvasElement,
      global: false,
      loadingScreen: false,
    });

    const source = new TraceSource(events);
    const ctx: GameContext = {
      seed,
      locale: null,
      skin: null,
      config: config as GameContext['config'],
    };
    const session = createSession({ k, flushFrame: shim.flushFrame, game, seed, ctx, headless: true, source });
    const { outcome } = session;

    const maxTicks = game.options.maxTicks;
    // Stop once the trace is consumed and the sim has had DRAIN_TICKS to settle.
    const drainUntil = Math.min(maxTicks, source.lastTick + DRAIN_TICKS);
    // One sim tick per frame, plus the load phase and a safety margin.
    const maxFrames = maxTicks + MAX_LOAD_FRAMES + DRAIN_TICKS + 50;

    let truncated = false;
    for (let f = 0; f < maxFrames; f++) {
      if (session.started()) {
        if (outcome.over) break;
        if (outcome.ticks >= maxTicks) {
          truncated = true;
          break;
        }
        if (outcome.ticks >= drainUntil) break;
      }
      session.frame();
      // Let async default-asset loads resolve while KAPLAY is still loading.
      if (k.loadProgress() < 1) await nextTask();
    }

    // Settle any trailing asset-load microtask before the shim is torn down.
    await nextTask();
    return { ...outcome, truncated };
  } finally {
    shim.uninstall();
  }
}
