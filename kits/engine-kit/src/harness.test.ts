import { describe, it, expect } from 'vitest';
import { defineEngine } from './define-engine';
import { rng, rngFromState, type RngState } from '@caputchin/determinism';
import { replay } from './harness';
import { FIXED_TIMESTEP_MS } from './constants';
import type { Seed, TickInput } from './types';

// A toy engine that exercises the contract: randomness via cap.rng kept in
// state as a serializable tuple, player actions applied at logical ticks, and a
// natural game-over. State is plain data (no closures) so it survives a
// structured-clone / JSON round-trip - the property the live worker relies on.
interface ToyState {
  rngState: RngState;
  tick: number;
  score: number;
}
interface ToyConfig {
  endTick: number;
  boostPoints: number;
}
type ToyAction = { kind: 'boost'; data?: unknown };

const toy = defineEngine<ToyState, ToyAction, ToyConfig>({
  init({ seed, config }) {
    const r = rng(seed);
    void config;
    return { rngState: r.state, tick: 0, score: 0 };
  },
  step(state, action) {
    if (action.kind === 'boost') return { ...state, score: state.score + 50 };
    return state;
  },
  tick(state) {
    const r = rngFromState(state.rngState);
    const gained = r.int(10); // 0..9 points of "drift" each tick
    return {
      rngState: r.state,
      tick: state.tick + 1,
      score: state.score + gained,
    };
  },
  isOver(state) {
    return state.tick >= 64;
  },
  result(state) {
    return { score: state.score, passed: state.score > 0 };
  },
});

const SEED: Seed = [0xabcddcba, 0x10203040, 0x55aa55aa, 0x0badf00d];
const CONFIG: ToyConfig = { endTick: 64, boostPoints: 50 };
const ACTIONS: TickInput<ToyAction>[] = [
  { tick: 3, action: { kind: 'boost' } },
  { tick: 3, action: { kind: 'boost' } },
  { tick: 20, action: { kind: 'boost' } },
  { tick: 50, action: { kind: 'boost' } },
];
const INPUT = { seed: SEED, config: CONFIG, actions: ACTIONS, maxTicks: 10000 };

describe('harness.replay', () => {
  it('is deterministic across runs', () => {
    const a = replay(toy, INPUT);
    const b = replay(toy, INPUT);
    expect(a).toEqual(b);
    expect(a.endTick).toBe(64);
    expect(a.durationMs).toBe(64 * FIXED_TIMESTEP_MS);
    expect(a.truncated).toBe(false);
    // replay surfaces the engine's pass decision (score > 0 here).
    expect(a.passed).toBe(true);
  });

  it('matches a hand-driven live loop (live == replay by construction)', () => {
    // Mirror what the live driver does frame by frame, recording the same
    // actions at the same ticks, then compare to the batch replay.
    const byTick = new Map<number, ToyAction[]>();
    for (const a of ACTIONS) {
      const arr = byTick.get(a.tick) ?? [];
      arr.push(a.action);
      byTick.set(a.tick, arr);
    }
    let s = toy.init({ seed: SEED, config: CONFIG });
    let tick = 0;
    while (!toy.isOver(s)) {
      for (const act of byTick.get(tick) ?? []) s = toy.step(s, act);
      s = toy.tick(s);
      tick++;
    }
    const live = { score: toy.result(s).score, endTick: tick };
    const batch = replay(toy, INPUT);
    expect(batch.score).toBe(live.score);
    expect(batch.endTick).toBe(live.endTick);
  });

  it('survives a JSON round-trip of state mid-run (state is serializable)', () => {
    let s = toy.init({ seed: SEED, config: CONFIG });
    for (let i = 0; i < 30; i++) s = toy.tick(s);
    const clone = JSON.parse(JSON.stringify(s)) as ToyState;
    expect(clone).toEqual(s);
    // continue both and confirm identical evolution
    let direct = s;
    let cloned = clone;
    for (let i = 0; i < 20; i++) {
      direct = toy.tick(direct);
      cloned = toy.tick(cloned);
    }
    expect(cloned).toEqual(direct);
  });

  it('flags a non-terminating engine via truncated', () => {
    const never = defineEngine<{ n: number }, ToyAction, ToyConfig>({
      init: () => ({ n: 0 }),
      step: (s) => s,
      tick: (s) => ({ n: s.n + 1 }),
      isOver: () => false,
      result: (s) => ({ score: s.n, passed: false }),
    });
    const out = replay(never, { seed: SEED, config: CONFIG, actions: [], maxTicks: 500 });
    expect(out.truncated).toBe(true);
    expect(out.endTick).toBe(500);
  });
});
