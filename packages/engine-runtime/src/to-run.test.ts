import { describe, it, expect } from 'vitest';
import { defineEngine } from './define-engine';
import { toRun } from './to-run';
import { encodeTrace } from './trace-codec';
import { rng, rngFromState, type RngState } from './rng';
import type { Seed, TickInput } from './types';

// A toy reducer: cap.rng kept in serializable state, a 'boost' action adds 50,
// natural game-over at tick 32. Exercises the full reducer -> toRun -> run path.
interface S {
  rngState: RngState;
  tick: number;
  score: number;
}
interface C {
  passScore: number;
}
type A = { kind: 'boost' };

const engine = defineEngine<S, A, C>({
  init: ({ seed }) => ({ rngState: rng(seed).state, tick: 0, score: 0 }),
  step: (s, a) => (a.kind === 'boost' ? { ...s, score: s.score + 50 } : s),
  tick: (s) => {
    const r = rngFromState(s.rngState);
    const gained = r.int(10);
    return { rngState: r.state, tick: s.tick + 1, score: s.score + gained };
  },
  isOver: (s) => s.tick >= 32,
  result: (s) => ({ score: s.score }),
});

const SEED: Seed = [0xabcddcba, 0x10203040, 0x55aa55aa, 0x0badf00d];
const CONFIG: C = { passScore: 100 };
const INPUTS: TickInput<A>[] = [
  { tick: 1, action: { kind: 'boost' } },
  { tick: 5, action: { kind: 'boost' } },
];
const TRACE = encodeTrace(INPUTS);

const run = toRun(engine, {
  config: CONFIG,
  maxTicks: 1000,
  passed: (o) => o.score >= CONFIG.passScore,
});

describe('toRun', () => {
  it('produces an identical verdict across runs (deterministic)', () => {
    expect(run(SEED, TRACE)).toEqual(run(SEED, TRACE));
  });

  it('returns a Verdict shape with the engine-derived duration', () => {
    const v = run(SEED, TRACE);
    expect(typeof v.passed).toBe('boolean');
    expect(typeof v.score).toBe('number');
    // ends at tick 32; FIXED_TIMESTEP_MS = 16 -> 512ms, engine-derived not claimed.
    expect(v.durationMs).toBe(32 * 16);
  });

  it('applies the pass predicate over the outcome', () => {
    // two boosts add 100, rng adds >=0 -> score >= passScore (100) -> passes.
    expect(run(SEED, TRACE).passed).toBe(true);
    const strict = toRun(engine, {
      config: CONFIG,
      maxTicks: 1000,
      passed: (o) => o.score >= 100_000,
    });
    expect(strict(SEED, TRACE).passed).toBe(false);
  });

  it('yields a failing verdict on a malformed or empty trace (never crashes)', () => {
    const fail = { passed: false, score: 0, durationMs: 0 };
    expect(run(SEED, '')).toEqual(fail);
    expect(run(SEED, 'not json')).toEqual(fail);
    expect(run(SEED, new Uint8Array(0))).toEqual(fail);
  });

  it('fails a truncated (non-terminating) run regardless of the predicate', () => {
    const never = defineEngine<{ n: number }, A, C>({
      init: () => ({ n: 0 }),
      step: (s) => s,
      tick: (s) => ({ n: s.n + 1 }),
      isOver: () => false,
      result: (s) => ({ score: s.n }),
    });
    const r = toRun(never, { config: CONFIG, maxTicks: 50, passed: () => true });
    expect(r(SEED, encodeTrace([])).passed).toBe(false);
  });
});
