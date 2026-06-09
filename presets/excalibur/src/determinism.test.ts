// Dogfood the preset: a tiny pointer-driven game replayed through excaliburRun
// must be deterministic for a seed, seed-sensitive across seeds, input-sensitive
// across traces, and clean under the platform replay self-check. `./install` is
// imported FIRST so the headless DOM shim + Math swap + frozen clock are in place
// before excalibur evaluates.
import './install';
import { describe, expect, it } from 'vitest';
import { selfCheckRun } from '@caputchin/replay-selfcheck';
import type { Seed } from '@caputchin/replay-contract';
import { defineExcaliburGame } from './define-game';
import { excaliburRun } from './run';
import { encodeTrace, type RecordedEvent } from './trace';
import { FIXED_TIMESTEP_MS } from './constants';

// A minimal sim: accumulate pointer coordinates + a seeded draw each tick, end at
// a fixed tick. No Excalibur actors needed - the sim runs entirely in onTick,
// driven by the engine's fixed update. Uses ONLY the api (no global Math / Date).
const game = defineExcaliburGame(
  (_engine, api) => {
    let acc = 0;
    api.onTick(() => {
      for (const ev of api.pointer.events) acc = (acc + ev.x + ev.y) >>> 0;
      acc = (acc + api.randi(1000)) >>> 0;
      api.setScore(acc);
      if (api.tick >= 40) {
        api.pass();
        api.gameOver();
      }
    });
  },
  { width: 400, height: 300, maxTicks: 200 },
);

const run = excaliburRun(game);

const SEED_A: Seed = [1, 2, 3, 4];
const SEED_B: Seed = [3735928559, 2596069104, 1, 4294967295];

describe('excaliburRun (headless determinism)', () => {
  it('is deterministic for a seed', async () => {
    const a1 = await run(SEED_A, null, '');
    const a2 = await run(SEED_A, null, '');
    expect(a1).toEqual(a2);
    expect(a1.passed).toBe(true);
    expect(a1.durationMs).toBeGreaterThan(0);
  });

  it('is seed-sensitive across seeds', async () => {
    const a = await run(SEED_A, null, '');
    const b = await run(SEED_B, null, '');
    expect(a.score).not.toBe(b.score);
  });

  it('is input-sensitive: a pointer trace changes the outcome', async () => {
    const empty = await run(SEED_A, null, '');
    const events: RecordedEvent[] = [
      { tick: 1, t: 0, k: 0, x: 120, y: 90 },
      { tick: 1, t: 0, k: 1, x: 140, y: 110 },
      { tick: 2, t: 0, k: 2, x: 160, y: 130 },
    ];
    const withInput = await run(SEED_A, null, encodeTrace(events));
    expect(withInput.score).not.toBe(empty.score);
    // Same trace + seed reproduces exactly.
    const again = await run(SEED_A, null, encodeTrace(events));
    expect(again).toEqual(withInput);
  });

  it('ends on the sim tick (duration tracks ticks run)', async () => {
    const v = await run(SEED_A, null, '');
    // gameOver latches at tick 40; the loop stops the tick after.
    expect(v.durationMs).toBe(41 * FIXED_TIMESTEP_MS);
  });

  it('fails a malformed trace instead of crashing', async () => {
    const v = await run(SEED_A, null, '{not valid');
    expect(v).toEqual({ passed: false, score: 0, durationMs: 0 });
  });

  it('passes the platform replay self-check (no ambient access, no drift)', async () => {
    const report = await selfCheckRun(run);
    expect(report.ok).toBe(true);
  });
});
