import type { Seed } from './types';

// Deterministic PRNG for engines. Algorithm: sfc32 (Small Fast Counter, 128-bit
// state) — fast, statistically strong, and built ONLY from int32 ops
// (`| 0`, `^`, `>>>`, `<<`, `+`), which are bit-identical across every JS engine
// and every V8 roll. The one float op, `(t >>> 0) / 4294967296`, divides a
// 32-bit unsigned by 2^32: an IEEE-754 correctly-rounded division, so also
// deterministic. No `Math.random`, no time, no platform dependence.
//
// The rng's internal state is exposed as a plain 4-number tuple (`state`) so an
// engine can keep it in its State and stay fully structured-clone-serializable
// (no closures cross the worker boundary). Resume an exact stream with
// `rngFromState`.

/** Serializable PRNG state: four unsigned 32-bit words. */
export type RngState = readonly [number, number, number, number];

export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Integer in [min, maxInclusive]. */
  intBetween(min: number, maxInclusive: number): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** True with probability p (default 0.5). */
  bool(p?: number): boolean;
  /** A uniformly chosen element. */
  pick<T>(arr: readonly T[]): T;
  /** A new array, Fisher-Yates shuffled (input untouched). */
  shuffle<T>(arr: readonly T[]): T[];
  /** Current internal state as a plain serializable tuple. */
  readonly state: RngState;
}

function make(a: number, b: number, c: number, d: number): Rng {
  a >>>= 0;
  b >>>= 0;
  c >>>= 0;
  d >>>= 0;

  function next(): number {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = ((a + b) | 0) + d | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11); // rotl 21
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  function int(maxExclusive: number): number {
    return Math.floor(next() * maxExclusive);
  }

  const rng: Rng = {
    next,
    int,
    intBetween(min, maxInclusive) {
      return min + int(maxInclusive - min + 1);
    },
    range(min, max) {
      return min + next() * (max - min);
    },
    bool(p = 0.5) {
      return next() < p;
    },
    pick(arr) {
      return arr[int(arr.length)];
    },
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1);
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
      return out;
    },
    get state(): RngState {
      return [a >>> 0, b >>> 0, c >>> 0, d >>> 0];
    },
  };
  return rng;
}

/**
 * Build a fresh PRNG from a 128-bit engine seed. The stream is mixed with a
 * fixed warm-up so low-entropy seeds (e.g. mostly-zero words) decorrelate
 * before first use; the warmed state is what `state` returns, so a later
 * `rngFromState` resumes exactly.
 */
export function rng(seed: Seed): Rng {
  const r = make(seed[0], seed[1], seed[2], seed[3]);
  for (let i = 0; i < 15; i++) r.next();
  return r;
}

/** Resume a PRNG from previously captured state — no warm-up, exact stream. */
export function rngFromState(s: RngState): Rng {
  return make(s[0], s[1], s[2], s[3]);
}
