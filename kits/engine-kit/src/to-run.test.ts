import { describe, it, expect } from 'vitest';
import { defineEngine } from './define-engine';
import { toRun } from './to-run';
import { encodeTrace } from './trace-codec';
import { rng, rngFromState, type RngState } from '@caputchin/determinism';
import type { Seed, TickInput } from './types';

// A toy reducer: cap.rng kept in serializable state, a 'boost' action adds 50,
// natural game-over at tick 32. Exercises the full reducer -> toRun -> run path.
interface S {
  rngState: RngState;
  tick: number;
  score: number;
  passScore: number; // resolved from the raw config INSIDE init
}
interface C {
  passScore: number;
}
type A = { kind: 'boost' };

const DEFAULT_PASS = 100;

// The engine OWNS config resolution (null -> default) + the pass decision: it
// stores the resolved passScore in state and reports passed in result. toRun
// only wires init -> replay -> result; no external defaultConfig / pass gate.
const engine = defineEngine<S, A, C>({
  init: ({ seed, config }) => ({
    rngState: rng(seed).state,
    tick: 0,
    score: 0,
    passScore: (config ?? { passScore: DEFAULT_PASS }).passScore,
  }),
  step: (s, a) => (a.kind === 'boost' ? { ...s, score: s.score + 50 } : s),
  tick: (s) => {
    const r = rngFromState(s.rngState);
    const gained = r.int(10);
    return { ...s, rngState: r.state, tick: s.tick + 1, score: s.score + gained };
  },
  isOver: (s) => s.tick >= 32,
  result: (s) => ({ score: s.score, passed: s.score >= s.passScore }),
});

const SEED: Seed = [0xabcddcba, 0x10203040, 0x55aa55aa, 0x0badf00d];
const INPUTS: TickInput<A>[] = [
  { tick: 1, action: { kind: 'boost' } },
  { tick: 5, action: { kind: 'boost' } },
];
const TRACE = encodeTrace(INPUTS);

const run = toRun(engine, { maxTicks: 1000 });

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

  it('takes the pass decision from the engine (engine resolves null->default; a supplied config moves the gate)', () => {
    // null -> the engine's default passScore (100); two boosts add 100 -> passes.
    expect(run(SEED, null, TRACE).passed).toBe(true);
    // A stricter supplied config raises the bar so the SAME (seed, trace) fails -
    // proving config is a run INPUT resolved inside the engine, not baked.
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

  it('fails a truncated (non-terminating) run even when the engine reports passed', () => {
    const never = defineEngine<{ n: number }, A, C>({
      init: () => ({ n: 0 }),
      step: (s) => s,
      tick: (s) => ({ n: s.n + 1 }),
      isOver: () => false,
      result: (s) => ({ score: s.n, passed: true }), // engine says pass...
    });
    const r = toRun(never, { maxTicks: 50 });
    // ...but the truncated guard in toRun overrides it.
    expect(r(SEED, null, encodeTrace([])).passed).toBe(false);
  });
});
