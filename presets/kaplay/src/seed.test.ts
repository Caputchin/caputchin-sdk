import { describe, it, expect } from 'vitest';
import { foldSeed } from './seed';
import type { Seed } from '@caputchin/replay-contract';

describe('foldSeed', () => {
  it('is deterministic and in KAPLAY randSeed range [0, 2^31)', () => {
    const s: Seed = [0xdeadbeef, 0x12345678, 0, 0xffffffff];
    const a = foldSeed(s);
    expect(foldSeed([...s] as Seed)).toBe(a);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(2147483648);
    expect(Number.isInteger(a)).toBe(true);
  });

  it('different seeds fold differently', () => {
    expect(foldSeed([1, 2, 3, 4])).not.toBe(foldSeed([1, 2, 3, 5]));
    expect(foldSeed([1, 0, 0, 0])).not.toBe(foldSeed([0, 1, 0, 0]));
  });
});
