import { describe, it, expect } from 'vitest';
// engine-kit no longer re-exports anything: selfCheck comes from
// @caputchin/replay-selfcheck, the deterministic primitives from
// @caputchin/determinism, the contract types from @caputchin/replay-contract.
// This test validates the reducer-lane integration the prober kit cannot test on
// its own (it has no defineEngine/toRun): a toRun-wrapped reducer using cap.rng +
// cap.math is deterministic under the prober.
import { defineEngine, toRun, encodeTrace } from './index';
import { selfCheck, type SelfCheckCase } from '@caputchin/replay-selfcheck';
import { rng, rngFromState, capMath } from '@caputchin/determinism';
import type { RunFn } from '@caputchin/replay-contract';

const CASES: SelfCheckCase[] = [{ seed: [1, 2, 3, 4], trace: encodeTrace([]), label: 'kit' }];

describe('engine-kit reducer-lane integration', () => {
  it('a defineEngine + toRun run (rng + capMath) is deterministic', async () => {
    interface S {
      rngState: readonly [number, number, number, number];
      ticks: number;
      acc: number;
    }
    const engine = defineEngine<S, number, { goal: number }, S>({
      init: ({ seed }) => {
        const r = rng(seed);
        return { rngState: r.state, ticks: 0, acc: Math.round(capMath.sin(seed[0]) * 1000) };
      },
      step: (s, action) => ({ ...s, acc: s.acc + action }),
      tick: (s) => {
        const r = rngFromState(s.rngState);
        const bump = r.int(5);
        return { ...s, rngState: r.state, ticks: s.ticks + 1, acc: s.acc + bump };
      },
      isOver: (s) => s.ticks >= 20,
      result: (s) => ({ score: s.acc, passed: s.acc > 0 }),
    });
    const run = toRun(engine, { maxTicks: 100 });
    // Inline cases so C infers from the typed run (the shared CASES is unknown-typed).
    const report = await selfCheck(run, [{ seed: [1, 2, 3, 4], trace: encodeTrace([]), label: 'kit' }]);
    expect(report.ok).toBe(true);
  });

  it('still flags ambient non-determinism (toRun run that reads Date)', async () => {
    const run: RunFn = () => ({ passed: Date.now() > 0, score: 1, durationMs: 1 });
    const report = await selfCheck(run, CASES);
    expect(report.ok).toBe(false);
    expect(report.cases[0]!.violations[0]!.kind).toBe('ambient-time');
  });
});
