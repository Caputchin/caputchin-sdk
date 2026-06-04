import { describe, it, expect } from 'vitest';
import { selfCheckRun, smokeCase, DEFAULT_SEEDS } from './index';
import type { RunFn } from '@caputchin/replay-contract';

describe('smokeCase', () => {
  it('is seed [0,0,0,0] over the given empty trace (default empty string)', () => {
    expect(smokeCase()).toEqual({ seed: [0, 0, 0, 0], trace: '', config: null, label: '(smoke: empty trace)' });
    expect(smokeCase('ENV').trace).toBe('ENV');
  });
});

describe('selfCheckRun', () => {
  it('passes a clean run and always includes the smoke case', async () => {
    const seen: string[] = [];
    const run: RunFn = (_seed, _config, trace) => {
      seen.push(typeof trace === 'string' ? trace : '<bytes>');
      return { passed: true, score: 1, durationMs: 1 };
    };
    const report = await selfCheckRun(run, { repeats: 2 });
    expect(report.ok).toBe(true);
    // smoke + each default seed
    expect(report.cases.length).toBe(1 + DEFAULT_SEEDS.length);
    expect(report.cases[0]!.label).toBe('(smoke: empty trace)');
  });

  it('fails when the run crashes on the empty (smoke) trace', async () => {
    const run: RunFn = (_seed, _config, trace) => {
      if (trace === '') throw new Error('cannot decode empty trace');
      return { passed: true, score: 1, durationMs: 1 };
    };
    const report = await selfCheckRun(run, { repeats: 2 });
    expect(report.ok).toBe(false);
    expect(report.cases[0]!.violations[0]!.kind).toBe('threw');
  });

  it('fails a non-deterministic run', async () => {
    const run: RunFn = () => ({ passed: true, score: Math.floor(Math.random() * 100), durationMs: 1 });
    const report = await selfCheckRun(run, { repeats: 2 });
    expect(report.ok).toBe(false);
  });
});
