import type { Seed } from '@caputchin/replay-contract';
import type { ResolvedLocale } from './locale';
import type { ResolvedSkin } from './skin';
import type { ResolvedConfig } from './config';

/** Per-session context the widget passes to the game factory as a third arg. */
export interface GameContext {
  /** Per-round replay seed: server-derived, the same value the server
   *  re-derives at replay. Seed all game randomness from it (e.g.
   *  `cap.rng(seed)`) so the live play is replayable. Null when the widget runs
   *  the game outside a verified session (no seed issued). */
  seed: Seed | null;
  locale: ResolvedLocale | null;
  skin: ResolvedSkin | null;
  config: ResolvedConfig | null;
}
