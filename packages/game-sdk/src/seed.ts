import type { Seed } from '@caputchin/replay-contract';

/**
 * Build a throwaway random {@link Seed} for a no-verify mount — a live preview
 * where the platform issued no per-round seed (no session). The replay never
 * runs without a session, so any seed just gives the preview some play variety.
 *
 * DRIVER-SIDE ONLY. It pulls entropy from `Math.random`, which is the OPPOSITE
 * of replay determinism — never call it inside a sim/reducer. A verified mount
 * always uses the server-issued `ctx.seed` instead:
 * `const seed = ctx?.seed ?? randomSeed();`
 */
export function randomSeed(): Seed {
  const u = (): number => Math.floor(Math.random() * 0x100000000) >>> 0;
  return [u(), u(), u(), u()];
}
