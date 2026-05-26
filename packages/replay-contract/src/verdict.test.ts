import { describe, it, expect } from 'vitest';
import { parseVerdict } from './verdict';

describe('parseVerdict', () => {
  it('accepts a well-formed verdict and returns exactly the three fields', () => {
    const v = parseVerdict({ passed: true, score: 42, durationMs: 1234, extra: 'ignored' });
    expect(v).toEqual({ passed: true, score: 42, durationMs: 1234 });
    expect(v).not.toHaveProperty('extra');
  });

  it('accepts a failing verdict', () => {
    expect(parseVerdict({ passed: false, score: 0, durationMs: 0 })).toEqual({
      passed: false,
      score: 0,
      durationMs: 0,
    });
  });

  it('rejects non-objects and null', () => {
    for (const x of [null, undefined, 7, 'verdict', true, []]) {
      expect(parseVerdict(x)).toBeNull();
    }
  });

  it('rejects a non-boolean passed', () => {
    expect(parseVerdict({ passed: 1, score: 0, durationMs: 0 })).toBeNull();
  });

  it('rejects a missing, non-numeric, or non-finite score', () => {
    expect(parseVerdict({ passed: true, durationMs: 0 })).toBeNull();
    expect(parseVerdict({ passed: true, score: '5', durationMs: 0 })).toBeNull();
    expect(parseVerdict({ passed: true, score: NaN, durationMs: 0 })).toBeNull();
    expect(parseVerdict({ passed: true, score: Infinity, durationMs: 0 })).toBeNull();
  });

  it('rejects a missing, non-finite, or negative durationMs', () => {
    expect(parseVerdict({ passed: true, score: 0 })).toBeNull();
    expect(parseVerdict({ passed: true, score: 0, durationMs: NaN })).toBeNull();
    expect(parseVerdict({ passed: true, score: 0, durationMs: -1 })).toBeNull();
  });
});
