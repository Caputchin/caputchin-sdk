import type { WidgetConfig } from '../config/widget.js';
import type { GameConfig } from '../config/game.js';
import type { CapClient } from '../cap/client.js';
import type { IframeHost } from '../iframe/host.js';
import type { Presentation } from '../modes/index.js';
import type { GamePresentation } from '../modes/game.js';
import type { TriggerStrategy, TriggerContext } from '../triggers/index.js';
import type { OverridesPerAxis } from '../bootstrap/types.js';

/** Per-mount mutable state. Generic in the config shape so both element
 *  classes share one definition; cap-only widgets simply leave the iframe
 *  / game fields undefined. Keeps every helper (run-cap, run-manual, the
 *  presentation hooks, methods) free of type juggling. */
export interface WidgetState<C extends WidgetConfig | GameConfig = WidgetConfig | GameConfig> {
  config: C | null;
  widgetId: string | null;
  presentation: Presentation | null;
  capClient: CapClient | null;
  trigger: TriggerStrategy | null;
  triggerCtx: TriggerContext | null;
  lockedToken: string | null;
  connected: boolean;
  // ---- game-only fields (left undefined on the cap widget) ----
  gamePresentation?: GamePresentation | null;
  iframeHost?: IframeHost | null;
  gameStartedEmitted?: boolean;
  gameErrored?: boolean;
  firstPassFired?: boolean;
  /** Per-game override banks (language/skin/configuration) from the bootstrap
   *  `game` block, captured at mount and applied over the game manifest
   *  presets when the iframe kicks off. Null when there's no sitekey (no
   *  bootstrap fetch) or the tier/scope yielded none. */
  gameOverrides?: OverridesPerAxis | null;
  /** Marketplace bundle url + integrity from the SAME mount-time bootstrap
   *  `game` block, so the game-load path reuses that one round trip instead
   *  of a second `/widget/bootstrap` call.
   *  `gameId` records which id the bootstrap fetched for — the run-time
   *  resolver only reuses it when the resolved id matches (a `games` pool
   *  pick can differ from the mount-time `game`, so that path resolves
   *  fresh). Null when no bootstrap ran (no sitekey) or it timed out. */
  gameBundle?: { gameId: string | null; url: string | null; integrity: string | null } | null;
}

export function createInitialState<C extends WidgetConfig | GameConfig>(): WidgetState<C> {
  return {
    config: null,
    widgetId: null,
    presentation: null,
    capClient: null,
    trigger: null,
    triggerCtx: null,
    lockedToken: null,
    connected: false,
    gamePresentation: null,
    iframeHost: null,
    gameStartedEmitted: false,
    gameErrored: false,
    firstPassFired: false,
    gameOverrides: null,
    gameBundle: null,
  };
}
