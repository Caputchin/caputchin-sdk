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
  defaultConfig: CONFIG,
  maxTicks: 1000,
  passed: (o, c) => o.score >= c.passScore,
});

describe('toRun', () => {
  it('produces an identical verdict across runs (deterministic)', () => {
    expect(run(SEED, null, TRACE)).toEqual(run(SEED, null, TRACE));
  });

  it('returns a Verdict shape with the engine-derived duration', () => {
    const v = run(SEED, null, TRACE);
    expect(typeof v.passed).toBe('boolean');
    expect(typeof v.score).toBe('number');
    // ends at tick 32; FIXED_TIMESTEP_MS = 16 -> 512ms, engine-derived not claimed.
    expect(v.durationMs).toBe(32 * 16);
  });

  it('applies the pass predicate over the outcome', () => {
    // two boosts add 100, rng adds >=0 -> score >= passScore (100) -> passes.
    expect(run(SEED, null, TRACE).passed).toBe(true);
    const strict = toRun(engine, {
      defaultConfig: CONFIG,
      maxTicks: 1000,
      passed: (o) => o.score >= 100_000,
    });
    expect(strict(SEED, null, TRACE).passed).toBe(false);
  });

  it('null config falls back to defaultConfig; a supplied config overrides it', () => {
    // defaultConfig.passScore = 100 (score ~100 -> passes). A stricter supplied
    // config raises the bar so the SAME (seed, trace) fails — proving config is a
    // run input, not baked, and that the gate reads from the server config.
    expect(run(SEED, null, TRACE).passed).toBe(true);
    expect(run(SEED, { passScore: 100_000 }, TRACE).passed).toBe(false);
    // Score + duration are identical regardless of config (config only moves the gate).
    const a = run(SEED, null, TRACE);
    const b = run(SEED, { passScore: 100_000 }, TRACE);
    expect(b.score).toBe(a.score);
    expect(b.durationMs).toBe(a.durationMs);
  });

  it('yields a failing verdict on a malformed or empty trace (never crashes)', () => {
    const fail = { passed: false, score: 0, durationMs: 0 };
    expect(run(SEED, null, '')).toEqual(fail);
    expect(run(SEED, null, 'not json')).toEqual(fail);
    expect(run(SEED, null, new Uint8Array(0))).toEqual(fail);
  });

  it('fails a truncated (non-terminating) run regardless of the predicate', () => {
    const never = defineEngine<{ n: number }, A, C>({
      init: () => ({ n: 0 }),
      step: (s) => s,
      tick: (s) => ({ n: s.n + 1 }),
      isOver: () => false,
      result: (s) => ({ score: s.n }),
    });
    const r = toRun(never, { defaultConfig: CONFIG, maxTicks: 50, passed: () => true });
    expect(r(SEED, null, encodeTrace([])).passed).toBe(false);
  });
});
