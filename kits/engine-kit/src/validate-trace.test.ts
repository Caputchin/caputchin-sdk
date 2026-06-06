import { describe, it, expect } from 'vitest';
import { isStructurallyValid, DEFAULT_MAX_ACTIONS_PER_TICK } from './validate-trace';
import type { TickInput } from './types';

const limits = { maxTicks: 100, maxActionsPerTick: 4 };
const mk = (ticks: number[]): TickInput<number>[] => ticks.map((t, i) => ({ tick: t, action: i }));

describe('isStructurallyValid', () => {
  it('accepts well-formed non-decreasing ticks within bounds', () => {
    expect(isStructurallyValid(mk([0, 1, 1, 5, 99]), limits)).toBe(true);
    expect(isStructurallyValid([], limits)).toBe(true);
  });

  it('rejects a tick at or past maxTicks', () => {
    expect(isStructurallyValid(mk([0, 100]), limits)).toBe(false);
    expect(isStructurallyValid(mk([0, 99]), limits)).toBe(true);
  });

  it('rejects a negative or non-integer tick', () => {
    expect(isStructurallyValid(mk([-1]), limits)).toBe(false);
    expect(isStructurallyValid([{ tick: 1.5, action: 0 }], limits)).toBe(false);
  });

  it('rejects ticks that run backwards', () => {
    expect(isStructurallyValid(mk([0, 5, 3]), limits)).toBe(false);
  });

  it('rejects more than maxActionsPerTick on a single tick, per-tick independent', () => {
    expect(isStructurallyValid(mk([2, 2, 2, 2]), limits)).toBe(true); // exactly the cap
    expect(isStructurallyValid(mk([2, 2, 2, 2, 2]), limits)).toBe(false); // one over
    expect(isStructurallyValid(mk([1, 1, 1, 1, 2, 2, 2, 2]), limits)).toBe(true); // resets per tick
  });

  it('ships a generous default cap', () => {
    expect(DEFAULT_MAX_ACTIONS_PER_TICK).toBeGreaterThanOrEqual(64);
  });
});
