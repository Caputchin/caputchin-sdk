import { describe, it, expect } from 'vitest';

import { normalizeOptionalNumber } from '../../../src/verify/payload.js';

// Customer-passed object literals are untyped at the boundary; anything that
// isn't a finite number must coerce to null so the scoreboard never records
// NaN / strings / undefined.
describe('normalizeOptionalNumber', () => {
  it('passes finite numbers through (including 0 and negatives)', () => {
    expect(normalizeOptionalNumber(0)).toBe(0);
    expect(normalizeOptionalNumber(42)).toBe(42);
    expect(normalizeOptionalNumber(-7)).toBe(-7);
  });

  it('coerces null / undefined to null', () => {
    expect(normalizeOptionalNumber(null)).toBeNull();
    expect(normalizeOptionalNumber(undefined)).toBeNull();
  });

  it('keeps non-finite numbers as-is (typeof number) but coerces non-numbers', () => {
    // NaN / Infinity are typeof 'number' so they pass the guard verbatim;
    // the contract only filters non-number types.
    expect(normalizeOptionalNumber(NaN)).toBeNaN();
    expect(normalizeOptionalNumber('5' as unknown as number)).toBeNull();
  });
});
