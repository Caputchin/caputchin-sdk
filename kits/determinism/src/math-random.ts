// Seeded `Math.random`: a tiny cross-engine-stable PRNG, plus a scoped trap that
// points `Math.random` at a seeded stream for the duration of one stepped callback
// and restores it after.
//
// A framework preset applies the trap IDENTICALLY on both ends (around the per-step
// callback on the live game AND the headless replay), so any raw `Math.random` an
// engine or author reads inside the stepped sim consumes the SAME seeded stream live
// and on the server, while render-side / between-frame code (live only) keeps real
// entropy and never advances the seeded stream (which would otherwise desync live
// from replay, since the server has no between-step code). Gameplay randomness should
// still go through a seeded RNG (see `rng` / `rngFromState`); this is defense-in-depth
// for the raw `Math.random` an engine might read directly in the step.
//
// The seed is taken structurally as a four-word tuple (the replay contract's `Seed`),
// so this module keeps the kit dependency-free.

/**
 * mulberry32: a tiny PRNG with 32-bit state. Pure integer ops (`Math.imul`, shifts,
 * xor) plus one float divide, so its stream is bit-identical across V8 builds
 * (browser == server) and untouched by the deterministic-Math swap. Shared by
 * {@link seedRandom} and {@link createMathRandomTrap}.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Independent derivation, so the trapped `Math.random` stream does not track (or
// perturb) a gameplay RNG seeded from the same four-word seed: the final xor
// decorrelates the two streams.
//
// The fold is an FNV-1a hash (Math.imul), NOT a plain word xor: a word xor
// collides badly - e.g. [3,3,3,3] and [8,8,8,8] both xor to 0, so distinct seeds
// would share a `Math.random` stream. FNV-1a is order- and value-sensitive, so
// different seeds reliably diverge. Pure integer ops, so it is bit-identical on
// every runtime.
function mathSeed(seed: readonly number[]): number {
  let h = 0x811c9dc5 | 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h, 0x01000193) ^ ((seed[i] ?? 0) >>> 0)) | 0;
  }
  return ((h >>> 0) ^ 0x9e3779b9) >>> 0;
}

/**
 * A seed-then-restore trap for `Math.random`, scoped to a stepped callback. Apply it
 * IDENTICALLY on both ends so any `Math.random` read inside the stepped sim consumes
 * the SAME seeded stream live and on the server.
 */
export interface MathRandomTrap {
  /** (Re)seed the stream from the round seed. Call once at scene / world create,
   *  beside the gameplay RNG seeding. */
  reset(seed: readonly number[]): void;
  /** Run `fn` with `Math.random` pointed at the seeded stream, then restore the real
   *  one (even if `fn` throws). The stream is CONTINUOUS across calls (each step
   *  advances it), so the Nth step consumes the same values both ends. */
  run<T>(fn: () => T): T;
}

export function createMathRandomTrap(): MathRandomTrap {
  // Constant until the first reset (deterministic either way).
  let next: () => number = () => 0;
  return {
    reset(seed: readonly number[]): void {
      next = mulberry32(mathSeed(seed));
    },
    run<T>(fn: () => T): T {
      const real = Math.random;
      Math.random = (): number => next();
      try {
        return fn();
      } finally {
        Math.random = real;
      }
    },
  };
}
