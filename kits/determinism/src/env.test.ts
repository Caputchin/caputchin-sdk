import { describe, it, expect } from 'vitest';
import { swapMath, makeDeterministic, withDeterministicEnv, capMath } from './index';

function freshMathScope(): { Math: Record<string, unknown> } {
  // Math's members are non-enumerable, so spread would miss them; copy every own
  // property into a fresh writable object.
  const m: Record<string, unknown> = {};
  for (const k of Object.getOwnPropertyNames(Math)) {
    m[k] = (Math as unknown as Record<string, unknown>)[k];
  }
  return { Math: m };
}

describe('swapMath', () => {
  it('swaps the non-deterministic transcendentals to capMath', () => {
    const scope = freshMathScope();
    const swapped = swapMath(scope);
    for (const name of ['sin', 'cos', 'tan', 'atan2', 'exp', 'log', 'pow', 'hypot']) {
      expect(swapped).toContain(name);
      expect(scope.Math[name]).toBe(capMath[name as keyof typeof capMath]);
    }
  });

  it('leaves the IEEE-mandated members untouched', () => {
    const scope = freshMathScope();
    swapMath(scope);
    expect(scope.Math.sqrt).toBe(Math.sqrt);
    expect(scope.Math.floor).toBe(Math.floor);
    expect(scope.Math.abs).toBe(Math.abs);
    expect(scope.Math.round).toBe(Math.round);
  });

  it('makeDeterministic composes the swap', () => {
    const scope = freshMathScope();
    expect(makeDeterministic(scope)).toContain('sin');
    expect(scope.Math.sin).toBe(capMath.sin);
  });

  it('a swapped Math.sin computes the deterministic value', () => {
    const scope = freshMathScope();
    swapMath(scope);
    const sin = scope.Math.sin as (x: number) => number;
    expect(sin(1)).toBe(capMath.sin(1));
  });
});

describe('withDeterministicEnv', () => {
  it('installs seeded random + fixed clock + capMath inside, restores after', () => {
    const realRandom = Math.random;
    const realSin = Math.sin;
    const realDateNow = Date.now;
    let inside: { sin: unknown; rnd: number; now: number; perf: number } | null = null;

    const seeded = (() => {
      let n = 0.25;
      return () => (n = (n + 0.1) % 1);
    })();

    const out = withDeterministicEnv({ random: seeded, nowMs: 4242 }, () => {
      inside = {
        sin: Math.sin,
        rnd: Math.random(),
        now: Date.now(),
        perf: typeof performance !== 'undefined' ? performance.now() : -1,
      };
      return 'ok';
    });

    expect(out).toBe('ok');
    // inside the call: deterministic env was active
    expect(inside!.sin).toBe(capMath.sin);
    expect(inside!.now).toBe(4242);
    if (typeof performance !== 'undefined') expect(inside!.perf).toBe(4242);
    // after: originals restored
    expect(Math.random).toBe(realRandom);
    expect(Math.sin).toBe(realSin);
    expect(Date.now).toBe(realDateNow);
  });

  it('restores the originals even when fn throws', () => {
    const realRandom = Math.random;
    const realSin = Math.sin;
    expect(() =>
      withDeterministicEnv({ random: () => 0.5, nowMs: 0 }, () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(Math.random).toBe(realRandom);
    expect(Math.sin).toBe(realSin);
  });

  it('two calls with the same seeded stream + clock are reproducible', () => {
    const run = (): number[] => {
      const seeded = (() => {
        let n = 0.1;
        return () => (n = (n * 1.3 + 0.07) % 1);
      })();
      const seen: number[] = [];
      for (let t = 0; t < 5; t += 1) {
        withDeterministicEnv({ random: seeded, nowMs: t * 16 }, () => {
          seen.push(Math.sin(Math.random() * Math.PI) + Date.now());
        });
      }
      return seen;
    };
    expect(run()).toEqual(run());
  });
});
