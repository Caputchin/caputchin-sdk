import { describe, it, expect } from 'vitest';
import { defineKaplayGame, kaplayRun, encodeTrace } from './index';
import type { Seed, RecordedEvent } from './index';

const SEED: Seed = [11, 22, 33, 44];

// Ends at tick 60; each 'go' press bumps the score by a flat 1000 (the press
// does not consume the RNG), so input replay shows up as an exact delta.
const ending = defineKaplayGame(
  (k, api) => {
    let score = 0;
    k.onFixedUpdate(() => {
      score = (score + api.randi(100)) | 0;
      if (api.justPressed('go')) score = (score + 1000) | 0;
      api.setScore(score);
      if (score >= 3000) api.pass();
      if (api.tick >= 60) api.gameOver();
    });
  },
  { actions: ['go'], maxTicks: 1000, kaplay: { width: 80, height: 80 } },
);

function goTrace(ticks: readonly number[]): string {
  const e: RecordedEvent[] = [];
  for (const t of ticks) {
    e.push({ tick: t, action: 0, press: true }, { tick: t, action: 0, press: false });
  }
  return encodeTrace(e);
}

describe('kaplayRun integration', () => {
  it('same seed + trace => identical verdict (determinism)', async () => {
    const run = kaplayRun(ending);
    const trace = goTrace([5, 20, 40]);
    const a = await run(SEED, null, trace);
    const b = await run(SEED, null, trace);
    expect(a).toEqual(b);
    expect(a.durationMs).toBe(60 * 20);
  });

  it('replays recorded input (three presses == +3000, RNG unchanged)', async () => {
    const run = kaplayRun(ending);
    const withGo = await run(SEED, null, goTrace([5, 20, 40]));
    const without = await run(SEED, null, goTrace([]));
    expect(withGo.score - without.score).toBe(3000);
  });

  it('malformed trace => failing verdict, never throws', async () => {
    const run = kaplayRun(ending);
    await expect(run(SEED, null, 'garbage')).resolves.toEqual({
      passed: false,
      score: 0,
      durationMs: 0,
    });
  });

  it('a finished trace that latched a pass without game-over is a valid pass', async () => {
    const passer = defineKaplayGame(
      (k, api) => {
        k.onFixedUpdate(() => {
          if (api.justPressed('go')) api.pass();
          api.setScore(api.tick);
        });
      },
      { actions: ['go'], maxTicks: 1000, kaplay: { width: 64, height: 64 } },
    );
    const v = await kaplayRun(passer)(SEED, null, goTrace([3]));
    expect(v.passed).toBe(true);
  });

  it('a non-terminating run is truncated and rejected even if it latched a pass', async () => {
    const forever = defineKaplayGame(
      (k, api) => {
        k.onFixedUpdate(() => {
          api.pass();
          api.setScore(api.tick);
        });
      },
      { actions: ['go'], maxTicks: 40, kaplay: { width: 64, height: 64 } },
    );
    const v = await kaplayRun(forever)(SEED, null, encodeTrace([]));
    expect(v.passed).toBe(false);
  });
});
