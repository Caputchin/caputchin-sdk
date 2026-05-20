import type { WidgetConfig } from '../config/widget.js';
import type { GameConfig } from '../config/game.js';
import type { CapClient } from '../cap/client.js';
import type { IframeHost } from '../iframe/host.js';
import type { Presentation } from '../modes/index.js';
import type { GamePresentation } from '../modes/game.js';
import type { TriggerStrategy, TriggerContext } from '../triggers/index.js';

/** Per-mount mutable state. Generic in the config shape so both element
 *  classes share one definition — cap-only widgets simply leave the iframe
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
  };
}
