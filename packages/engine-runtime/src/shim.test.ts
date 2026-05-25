import { describe, it, expect } from 'vitest';
import { applyShim } from './shim';
import { capMath } from './math';

describe('applyShim', () => {
  it('swaps Math transcendentals to cap.math and bans Math.random', () => {
    const fakeMath: Record<string, unknown> = {
      sin: Math.sin,
      cos: Math.cos,
      random: Math.random,
      sqrt: Math.sqrt,
    };
    const scope = { Math: fakeMath } as Record<string, unknown>;
    applyShim(scope);

    expect(fakeMath.sin).toBe(capMath.sin);
    expect(fakeMath.cos).toBe(capMath.cos);
    expect(fakeMath.sqrt).toBe(Math.sqrt); // deterministic already — left intact
    expect(() => (fakeMath.random as () => number)()).toThrow(/non-deterministic|cap\.rng/);
  });

  it('neutralizes non-deterministic globals with a loud thrower', () => {
    const scope: Record<string, unknown> = {
      Math: { ...Math },
      Date,
      fetch: () => Promise.resolve(),
      setTimeout: () => 0,
      crypto: {},
      Intl: {},
      navigator: {},
      WebAssembly: {},
    };
    const neutralized = applyShim(scope);

    for (const name of ['Date', 'fetch', 'setTimeout', 'Intl', 'navigator', 'WebAssembly'])
      expect(neutralized).toContain(name);

    // call + construct fail loud
    expect(() => (scope.Date as () => unknown)()).toThrow(/non-deterministic/);
    expect(() => new (scope.Date as new () => unknown)()).toThrow(/non-deterministic/);
    expect(() => (scope.fetch as () => unknown)()).toThrow(/non-deterministic/);

    // the key fix: property access on a NAMESPACE global fails loud too, not
    // a cryptic `undefined is not a function`
    expect(() => (scope.crypto as { getRandomValues: unknown }).getRandomValues).toThrow(/non-deterministic/);
    expect(() => (scope.Intl as { DateTimeFormat: unknown }).DateTimeFormat).toThrow(/non-deterministic/);
    expect(() => (scope.navigator as { language: unknown }).language).toThrow(/non-deterministic/);
    expect(() => (scope.WebAssembly as { instantiate: unknown }).instantiate).toThrow(/non-deterministic/);

    // typeof stays 'function' so benign feature-detection doesn't trip
    expect(typeof scope.fetch).toBe('function');
  });
});
