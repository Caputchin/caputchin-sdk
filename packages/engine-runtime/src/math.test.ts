import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { capMath } from './math';

// Accuracy is a quality bar (the identical JS runs both ends, so determinism
// holds regardless); we still hold cap.math close to the native libm over
// normal game ranges so physics looks right.
function maxRelErr(f: (x: number) => number, g: (x: number) => number, xs: number[]): number {
  let worst = 0;
  for (const x of xs) {
    const a = f(x);
    const b = g(x);
    const denom = Math.abs(b) > 1e-12 ? Math.abs(b) : 1;
    worst = Math.max(worst, Math.abs(a - b) / denom);
  }
  return worst;
}

const lin = (lo: number, hi: number, n: number): number[] =>
  Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));

describe('cap.math accuracy vs native', () => {
  it('sin / cos / tan', () => {
    const xs = lin(-12, 12, 401);
    expect(maxRelErr(capMath.sin, Math.sin, xs)).toBeLessThan(1e-9);
    expect(maxRelErr(capMath.cos, Math.cos, xs)).toBeLessThan(1e-9);
    // tan blows up near pi/2; sample away from the poles
    const xt = lin(-1.3, 1.3, 201);
    expect(maxRelErr(capMath.tan, Math.tan, xt)).toBeLessThan(1e-9);
  });

  it('exp / log', () => {
    expect(maxRelErr(capMath.exp, Math.exp, lin(-20, 20, 401))).toBeLessThan(1e-10);
    expect(maxRelErr(capMath.log, Math.log, lin(1e-3, 1e6, 401))).toBeLessThan(1e-10);
  });

  it('atan / atan2 / asin / acos', () => {
    expect(maxRelErr(capMath.atan, Math.atan, lin(-100, 100, 401))).toBeLessThan(1e-9);
    expect(maxRelErr(capMath.asin, Math.asin, lin(-0.99, 0.99, 201))).toBeLessThan(1e-9);
    expect(maxRelErr(capMath.acos, Math.acos, lin(-0.99, 0.99, 201))).toBeLessThan(1e-9);
    for (const y of lin(-10, 10, 21))
      for (const x of lin(-10, 10, 21))
        if (x !== 0 || y !== 0)
          expect(Math.abs(capMath.atan2(y, x) - Math.atan2(y, x))).toBeLessThan(1e-9);
  });

  it('pow / hypot / cbrt', () => {
    for (const base of [0.1, 0.5, 1.5, 2, 7, 100])
      for (const e of lin(-5, 5, 21))
        expect(Math.abs(capMath.pow(base, e) - Math.pow(base, e)) / Math.pow(base, e)).toBeLessThan(1e-8);
    expect(Math.abs(capMath.hypot(3, 4) - 5)).toBeLessThan(1e-12);
    expect(Math.abs(capMath.cbrt(27) - 3)).toBeLessThan(1e-9);
    expect(Math.abs(capMath.cbrt(-8) + 2)).toBeLessThan(1e-9);
  });

  it('integer exponents are EXACT (squaring fast-path, not exp/log)', () => {
    expect(capMath.pow(-2, 30)).toBe(1073741824); // exact, no 999.9999996
    expect(capMath.pow(2, 10)).toBe(1024);
    expect(capMath.pow(-2, 3)).toBe(-8);
    expect(capMath.pow(3, 0)).toBe(1);
    expect(capMath.pow(5, -2)).toBe(1 / 25);
    expect(capMath.pow(10, 6)).toBe(1000000);
  });

  it('handles signs and edge inputs', () => {
    expect(capMath.sin(0)).toBe(0);
    expect(capMath.cos(0)).toBe(1);
    expect(capMath.pow(2, 0)).toBe(1);
    expect(capMath.pow(-2, 3)).toBeCloseTo(-8, 9);
    expect(Number.isNaN(capMath.pow(-2, 0.5))).toBe(true);
    expect(capMath.exp(-Infinity)).toBe(0);
    expect(Number.isNaN(capMath.log(-1))).toBe(true);
  });
});

describe('cap.math determinism', () => {
  it('is referentially stable (same input → same bits)', () => {
    for (const x of lin(-7, 7, 97)) {
      expect(capMath.sin(x)).toBe(capMath.sin(x));
      expect(capMath.exp(x)).toBe(capMath.exp(x));
    }
  });

  // The permanent audit line: cap.math must never call a native
  // transcendental, or it reintroduces architecture-dependent divergence.
  it('source uses no banned native transcendental', () => {
    const src = readFileSync(fileURLToPath(new URL('./math.ts', import.meta.url)), 'utf8');
    // Strip comments first — the audit is about CALLS, not prose that names them.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    // 1. dotted native transcendentals
    const dotted =
      /Math\.(sin|cos|tan|asin|acos|atan|atan2|exp|expm1|log|log2|log10|log1p|pow|hypot|cbrt|sinh|cosh|tanh|random)\b/g;
    // 2. bracket access (`Math["sin"]`) — could reach any member dynamically
    const bracket = /Math\s*\[/g;
    // 3. aliasing the whole Math object (`const M = Math`, `x = Math`) — would
    //    let a banned member be reached through the alias, dodging checks 1+2
    const aliased = /[=:]\s*Math\b(?!\s*\.(?:abs|floor|ceil|round|trunc|sign|min|max|sqrt)\b)/g;
    const hits = [
      ...(code.match(dotted) ?? []),
      ...(code.match(bracket) ?? []),
      ...(code.match(aliased) ?? []),
    ];
    expect(hits).toEqual([]);
  });
});
