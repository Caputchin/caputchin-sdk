import Phaser from 'phaser';
import type { Seed } from '@caputchin/replay-contract';

/**
 * Build Phaser's own seeded PRNG from the platform {@link Seed}.
 *
 * The platform seed is four u32 words; Phaser's `RandomDataGenerator` seeds from
 * an array of strings, so the words are stringified. Use this for ALL gameplay
 * randomness (serve direction, spawn jitter, anything the trace must reproduce)
 * in both the live game and the headless run, so the player runtime and the
 * server isolate draw the identical sequence.
 *
 * This is independent of the internal `Math.random` stub the shim installs:
 * that stub covers Phaser's own internal calls; this generator is the sim's
 * explicit, author-controlled source of randomness.
 */
export function seedFromPlatform(seed: Seed): Phaser.Math.RandomDataGenerator {
  return new Phaser.Math.RandomDataGenerator(seed.map(String));
}
