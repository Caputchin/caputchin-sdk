import { describe, it, expect } from 'vitest';
import { selfCheck, type SelfCheckCase } from './prober';
import { capMath } from '@caputchin/determinism';
import type { RunFn, Seed, Verdict } from '@caputchin/replay-contract';

const SEED: Seed = [1, 2, 3, 4];
const CASES: SelfCheckCase[] = [{ seed: SEED, trace: '', label: 'probe' }];

// Find an input where native Math.sin and the deterministic cap.math.sin differ
// (they diverge in the low bits for almost any non-trivial argument). The trig
// probe must detect ANY such difference; picking a provably-divergent x keeps
// the test independent of the host engine's libm.
function divergentSinInput(): number {
  for (let x = 1; x < 200; x++) {
    if (Math.sin(x) !== capMath.sin(x)) return x;
  }
  throw new Error('no divergent sin input found (unexpected)');
}

describe('selfCheck - passes a clean deterministic run', () => {
  it('a pure run over seed/trace is deterministic', async () => {
    const run: RunFn = (seed) => ({ passed: true, score: (seed[0] % 10) + 1, durationMs: 100 });
    const report = await selfCheck(run, CASES);
    expect(report.ok).toBe(true);
    expect(report.cases[0]!.violations).toEqual([]);
    expect(report.cases[0]!.verdict).toEqual({ passed: true, score: 2, durationMs: 100 });
  });
});

describe('selfCheck - flags ambient non-determinism', () => {
  it('flags a run that reads Date.now()', async () => {
    const run: RunFn = () => ({ passed: Date.now() > 0, score: 1, durationMs: 1 });
    const report = await selfCheck(run, CASES);
    expect(report.ok).toBe(false);
    expect(report.cases[0]!.violations[0]!.kind).toBe('ambient-time');
  });

  it('flags a run that reads performance.now()', async () => {
    const run: RunFn = () => ({ passed: performance.now() >= 0, score: 1, durationMs: 1 });
    const report = await selfCheck(run, CASES);
    expect(report.cases[0]!.violations[0]!.kind).toBe('ambient-time');
  });

  it('flags a run that calls Math.random()', async () => {
    const run: RunFn = () => ({ passed: true, score: Math.floor(Math.random() * 100), durationMs: 1 });
    const report = await selfCheck(run, CASES);
    expect(report.ok).toBe(false);
    expect(report.cases[0]!.violations[0]!.kind).toBe('ambient-random');
  });

  it('flags a run that reads crypto', async () => {
    const run: RunFn = () => {
      const a = new Uint8Array(1);
      crypto.getRandomValues(a);
      return { passed: true, score: a[0]!, durationMs: 1 };
    };
    const report = await selfCheck(run, CASES);
    expect(report.cases[0]!.violations[0]!.kind).toBe('ambient-random');
  });

  it('flags a run whose verdict depends on native (non-cap) trig', async () => {
    const x = divergentSinInput();
    const run: RunFn = () => ({ passed: true, score: Math.sin(x), durationMs: 1 });
    const report = await selfCheck(run, CASES);
    expect(report.ok).toBe(false);
    expect(report.cases[0]!.violations.map((v) => v.kind)).toContain('ambient-trig');
  });

  it('does NOT flag a run that uses cap.math.sin (deterministic trig)', async () => {
    const x = divergentSinInput();
    const run: RunFn = () => ({ passed: true, score: capMath.sin(x), durationMs: 1 });
    const report = await selfCheck(run, CASES);
    expect(report.ok).toBe(true);
  });
});

describe('selfCheck - flags instability + bad output', () => {
  it('flags a run that drifts across identical re-runs', async () => {
    let n = 0;
    const run: RunFn = () => ({ passed: true, score: n++, durationMs: 1 });
    const report = await selfCheck(run, CASES, { repeats: 4 });
    expect(report.ok).toBe(false);
    expect(report.cases[0]!.violations[0]!.kind).toBe('unstable');
  });

  it('flags a run that returns a non-Verdict shape', async () => {
    const run = (() => ({ passed: 'yes', score: 1, durationMs: 1 })) as unknown as RunFn;
    const report = await selfCheck(run, CASES);
    expect(report.cases[0]!.violations[0]!.kind).toBe('invalid-verdict');
    expect(report.cases[0]!.verdict).toBeNull();
  });

  it('flags a run that throws (non-ambient)', async () => {
    const run: RunFn = () => {
      throw new Error('boom');
    };
    const report = await selfCheck(run, CASES);
    expect(report.cases[0]!.violations[0]!.kind).toBe('threw');
  });

  it('awaits an async run', async () => {
    const run: RunFn = async (seed): Promise<Verdict> => {
      await Promise.resolve();
      return { passed: true, score: seed[0]!, durationMs: 1 };
    };
    const report = await selfCheck(run, CASES);
    expect(report.ok).toBe(true);
    expect(report.cases[0]!.verdict).toEqual({ passed: true, score: 1, durationMs: 1 });
  });
});

describe('selfCheck - aggregate report', () => {
  it('ok is false when any one of several cases is non-deterministic', async () => {
    const run: RunFn = (seed) => ({ passed: true, score: seed[0] === 1 ? Date.now() : 5, durationMs: 1 });
    const cases: SelfCheckCase[] = [
      { seed: [9, 0, 0, 0], trace: '', label: 'clean' },
      { seed: [1, 0, 0, 0], trace: '', label: 'dirty' },
    ];
    const report = await selfCheck(run, cases);
    expect(report.ok).toBe(false);
    expect(report.cases.find((c) => c.label === 'clean')!.deterministic).toBe(true);
    expect(report.cases.find((c) => c.label === 'dirty')!.deterministic).toBe(false);
  });

  it('restores patched globals after running (Date works again)', async () => {
    const before = Date.now();
    await selfCheck(() => ({ passed: Date.now() > 0, score: 1, durationMs: 1 }), CASES);
    expect(typeof Date.now()).toBe('number');
    expect(Date.now()).toBeGreaterThanOrEqual(before);
  });
});
