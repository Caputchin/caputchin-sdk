import { describe, expect, it } from 'vitest';
import { createMathRandomTrap, mulberry32 } from './math-random.js';

describe('mulberry32', () => {
  it('is deterministic and bounded in [0, 1)', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 8; i++) {
      const v = a();
      expect(v).toBe(b()); // same seed -> same stream
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('diverges for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('createMathRandomTrap', () => {
  it('points Math.random at the seeded stream inside run() and restores it after', () => {
    const trap = createMathRandomTrap();
    trap.reset([1, 2, 3, 4]);
    const real = Math.random;
    let inside: number | undefined;
    const ret = trap.run(() => {
      inside = Math.random();
      return 'ok';
    });
    expect(ret).toBe('ok');
    expect(Math.random).toBe(real); // restored to the real fn
    expect(inside).toBeGreaterThanOrEqual(0);
    expect(inside).toBeLessThan(1);
  });

  it('restores Math.random even when the wrapped fn throws', () => {
    const trap = createMathRandomTrap();
    trap.reset([1, 2, 3, 4]);
    const real = Math.random;
    expect(() => trap.run(() => { throw new Error('boom'); })).toThrow('boom');
    expect(Math.random).toBe(real);
  });

  it('two traps reset to the same seed produce identical streams (cross-end determinism)', () => {
    const a = createMathRandomTrap();
    const b = createMathRandomTrap();
    a.reset([9, 8, 7, 6]);
    b.reset([9, 8, 7, 6]);
    const seqA: number[] = [];
    const seqB: number[] = [];
    for (let i = 0; i < 6; i++) {
      a.run(() => { seqA.push(Math.random()); });
      b.run(() => { seqB.push(Math.random()); });
    }
    expect(seqA).toEqual(seqB);
  });

  it('distinct seeds diverge even when their words xor-cancel (fold is not a plain xor)', () => {
    // [3,3,3,3] and [8,8,8,8] both xor to 0; a plain word-xor fold would hand them
    // the SAME Math.random stream. The fold must be order/value-sensitive.
    const a = createMathRandomTrap();
    const b = createMathRandomTrap();
    a.reset([3, 3, 3, 3]);
    b.reset([8, 8, 8, 8]);
    expect(a.run(() => Math.random())).not.toBe(b.run(() => Math.random()));
  });

  it('the stream is continuous across run() calls (one consume per step)', () => {
    const trap = createMathRandomTrap();
    trap.reset([3, 1, 4, 1]);
    const got: number[] = [];
    for (let i = 0; i < 5; i++) trap.run(() => { got.push(Math.random()); });
    expect(new Set(got).size).toBe(got.length); // distinct -> the cursor advanced, not reset per call
    // ...and re-running the same seed reproduces the exact sequence
    const trap2 = createMathRandomTrap();
    trap2.reset([3, 1, 4, 1]);
    const again: number[] = [];
    for (let i = 0; i < 5; i++) trap2.run(() => { again.push(Math.random()); });
    expect(again).toEqual(got);
  });

  it('reset re-seeds the stream from the start', () => {
    const trap = createMathRandomTrap();
    trap.reset([1, 2, 3, 4]);
    const first = trap.run(() => Math.random());
    trap.run(() => Math.random()); // advance
    trap.reset([1, 2, 3, 4]); // re-seed
    expect(trap.run(() => Math.random())).toBe(first);
  });
});
