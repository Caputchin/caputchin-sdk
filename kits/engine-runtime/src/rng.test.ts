import { describe, it, expect } from 'vitest';
import { rng, rngFromState } from './rng';
import type { Seed } from './types';

const SEED: Seed = [0x12345678, 0x9abcdef0, 0x0f1e2d3c, 0xdeadbeef];

describe('cap.rng', () => {
  it('is deterministic for a given seed', () => {
    const a = rng(SEED);
    const b = rng(SEED);
    const seqA = Array.from({ length: 1000 }, () => a.next());
    const seqB = Array.from({ length: 1000 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('differs across seeds', () => {
    const a = rng(SEED);
    const b = rng([1, 2, 3, 4]);
    expect(a.next()).not.toBe(b.next());
  });

  it('produces floats in [0, 1)', () => {
    const r = rng(SEED);
    for (let i = 0; i < 10000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('resumes exactly from serializable state', () => {
    const r = rng(SEED);
    for (let i = 0; i < 50; i++) r.next();
    const snapshot = r.state; // plain [number,number,number,number]
    expect(snapshot).toHaveLength(4);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);

    const continuedDirect = Array.from({ length: 100 }, () => r.next());
    const resumed = rngFromState(snapshot);
    const continuedResumed = Array.from({ length: 100 }, () => resumed.next());
    expect(continuedResumed).toEqual(continuedDirect);
  });

  it('int / intBetween / pick / shuffle stay in range and are deterministic', () => {
    const r1 = rng(SEED);
    const r2 = rng(SEED);
    const arr = [10, 20, 30, 40, 50];
    for (let i = 0; i < 500; i++) {
      const n = r1.int(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
      const b = r1.intBetween(3, 9);
      expect(b).toBeGreaterThanOrEqual(3);
      expect(b).toBeLessThanOrEqual(9);
      expect(arr).toContain(r1.pick(arr));
    }
    // shuffle is a permutation and matches a second rng with the same seed
    const s1 = r2.shuffle(arr);
    const s2 = rng(SEED).shuffle(arr);
    // r2 was only used for the shuffle above, so a fresh same-seed rng's first
    // shuffle equals it.
    expect(s1).toEqual(s2);
    expect([...s1].sort((a, b) => a - b)).toEqual(arr);
  });
});
