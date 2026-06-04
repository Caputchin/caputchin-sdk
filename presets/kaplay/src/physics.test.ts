import { describe, it, expect } from 'vitest';
import { defineKaplayGame, kaplayRun, encodeTrace } from './index';
import type { Seed, RecordedEvent } from './index';

const SEED: Seed = [5, 9, 13, 17];

function goTrace(ticks: readonly number[]): string {
  const e: RecordedEvent[] = [];
  for (const t of ticks) {
    e.push({ tick: t, action: 0, press: true }, { tick: t + 1, action: 0, press: false });
  }
  return encodeTrace(e);
}

// A game driven by KAPLAY's OWN engine: gravity + body + area collision +
// move(), plus a seeded k.rand jitter. The whole point of the preset is that the
// author uses the full engine and it still replays bit-for-bit.
const fullEngineGame = defineKaplayGame(
  (k, api) => {
    k.setGravity(1200);
    const ball = k.add([k.pos(40, 20), k.rect(10, 10), k.area(), k.body()]);
    k.add([k.pos(0, 180), k.rect(200, 20), k.area(), k.body({ isStatic: true })]);
    let s = 0;
    k.onFixedUpdate(() => {
      if (api.justPressed('go') && ball.isGrounded()) ball.jump(600);
      // seeded horizontal jitter through KAPLAY's own RNG + move()
      ball.move(api.randi(60) - 30, 0);
      s = (s + Math.round(ball.pos.x) + Math.round(ball.pos.y)) | 0;
      api.setScore(s);
      if (api.tick >= 90) api.gameOver();
    });
  },
  { actions: ['go'], maxTicks: 300, kaplay: { width: 200, height: 200 } },
);

// A game whose sim reads ENTROPY three ways KAPLAY routes through the host
// `Math.random` (unseeded by default): raw `Math.random()`, KAPLAY's own
// `chooseMultiple`, and KAPLAY's own `shuffle`. The preset seeds `Math.random`,
// so all three must reproduce bit-for-bit - the trap is closed, not just
// documented-as-forbidden.
const mathRandomGame = defineKaplayGame(
  (k, api) => {
    let s = 0;
    k.onFixedUpdate(() => {
      s = (s + Math.floor(Math.random() * 1000)) | 0;
      const picked = k.chooseMultiple([1, 2, 3, 4, 5, 6, 7], 3) as number[];
      s = (s + picked.reduce((x, y) => x + y, 0)) | 0;
      const shuffled = k.shuffle([10, 20, 30, 40]) as number[];
      s = (s + (shuffled[0] ?? 0) * 7) | 0;
      api.setScore(s);
      if (api.tick >= 40) api.gameOver();
    });
  },
  { actions: ['go'], maxTicks: 120, kaplay: { width: 100, height: 100 } },
);

describe('full-engine determinism', () => {
  it('KAPLAY physics (gravity + body + area) + k.rand replay identically', async () => {
    const run = kaplayRun(fullEngineGame);
    const trace = goTrace([10, 35, 60]);
    const a = await run(SEED, null, trace);
    const b = await run(SEED, null, trace);
    expect(a).toEqual(b);
    // the physics + RNG actually moved the ball (not a trivially-zero run)
    expect(a.score).not.toBe(0);
    expect(a.durationMs).toBe(90 * 20);
  }, 30000);

  it('different seeds diverge (the RNG genuinely feeds the sim)', async () => {
    const run = kaplayRun(fullEngineGame);
    const trace = goTrace([10]);
    const a = await run([1, 1, 1, 1], null, trace);
    const c = await run([2, 2, 2, 2], null, trace);
    expect(a.score).not.toBe(c.score);
  }, 30000);

  it('raw Math.random + KAPLAY shuffle/chooseMultiple replay identically (the trap is seeded)', async () => {
    const run = kaplayRun(mathRandomGame);
    const trace = goTrace([5]);
    const a = await run(SEED, null, trace);
    const b = await run(SEED, null, trace);
    expect(a).toEqual(b);
    // the entropy genuinely moved the score (not a trivially-zero run)
    expect(a.score).not.toBe(0);
  }, 30000);

  it('Math.random stream tracks the seed (different seeds diverge)', async () => {
    const run = kaplayRun(mathRandomGame);
    const trace = goTrace([5]);
    const a = await run([3, 3, 3, 3], null, trace);
    const c = await run([8, 8, 8, 8], null, trace);
    expect(a.score).not.toBe(c.score);
  }, 30000);
});
