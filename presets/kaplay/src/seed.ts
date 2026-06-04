import type { Seed } from '@caputchin/replay-contract';

/**
 * Fold the four-word platform {@link Seed} into one positive integer below 2^31,
 * which is what KAPLAY's `randSeed` accepts. Uses a fixed integer hash
 * (`Math.imul`), so it is bit-identical on every runtime.
 */
export function foldSeed(seed: Seed): number {
  let h = 0x811c9dc5 | 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h, 0x01000193) ^ (seed[i] >>> 0)) | 0;
  }
  return (h >>> 0) % 2147483648;
}
