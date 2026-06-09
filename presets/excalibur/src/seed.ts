import type { Seed } from '@caputchin/replay-contract';

/**
 * Fold a 128-bit platform {@link Seed} into a single unsigned 32-bit integer, for
 * APIs that take a numeric seed (e.g. `ex.Random`). The gameplay RNG should use
 * the full-entropy `rng(seed)` from `@caputchin/determinism` instead; this is only
 * for engine internals that demand a number. Never zero (some PRNGs degenerate on
 * a zero seed), so a zero fold maps to 1.
 */
export function foldSeed(seed: Seed): number {
  return ((seed[0] ^ seed[1] ^ seed[2] ^ seed[3]) >>> 0) || 1;
}
