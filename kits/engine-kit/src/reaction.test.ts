import { describe, it, expect } from 'vitest';
import { FIXED_TIMESTEP_MS } from './constants';
import { REACTION_FLOOR_MS, reactionFloorTicks, isHumanReaction } from './reaction';

describe('reactionFloorTicks', () => {
  it('rounds ms up to whole ticks', () => {
    expect(reactionFloorTicks(0)).toBe(0);
    expect(reactionFloorTicks(FIXED_TIMESTEP_MS)).toBe(1);
    expect(reactionFloorTicks(FIXED_TIMESTEP_MS + 1)).toBe(2);
    expect(reactionFloorTicks(100)).toBe(Math.ceil(100 / FIXED_TIMESTEP_MS));
  });

  it('defaults to REACTION_FLOOR_MS', () => {
    expect(reactionFloorTicks()).toBe(reactionFloorTicks(REACTION_FLOOR_MS));
    expect(reactionFloorTicks()).toBeGreaterThan(0);
  });
});

describe('isHumanReaction', () => {
  const floor = reactionFloorTicks();

  it('rejects a frame-perfect hit (latency below the floor)', () => {
    expect(isHumanReaction(10, 10)).toBe(false); // zero latency
    expect(isHumanReaction(10, 11)).toBe(false); // one tick
    expect(isHumanReaction(10, 10 + floor - 1)).toBe(false);
  });

  it('accepts a hit at or above the floor', () => {
    expect(isHumanReaction(10, 10 + floor)).toBe(true);
    expect(isHumanReaction(10, 10 + floor + 5)).toBe(true);
  });

  it('rejects a hit landing before the target appeared (tamper)', () => {
    expect(isHumanReaction(10, 5)).toBe(false);
  });

  it('honors an explicit floor', () => {
    expect(isHumanReaction(0, 3, 3)).toBe(true);
    expect(isHumanReaction(0, 2, 3)).toBe(false);
  });
});
