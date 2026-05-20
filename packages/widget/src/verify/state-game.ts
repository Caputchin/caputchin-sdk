import type { GameConfig } from '../config/game.js';
import type { CapClient } from '../cap/client.js';
import type { IframeHost } from '../iframe/host.js';
import type { GamePresentation } from '../modes/game.js';
import type { TriggerStrategy, TriggerContext } from '../triggers/index.js';

/** Per-mount state for `<caputchin-game>`. */
export interface GameState {
  config: GameConfig | null;
  widgetId: string | null;
  gamePresentation: GamePresentation | null;
  iframeHost: IframeHost | null;
  capClient: CapClient | null;
  trigger: TriggerStrategy | null;
  triggerCtx: TriggerContext | null;
  gameStartedEmitted: boolean;
  /** Set when the iframe game reported a fatal error; suppresses the duplicate
   * `verification-failed` event the catch handler would otherwise fire after
   * cap.solve rejects from the aborted gate. */
  gameErrored: boolean;
  /** Locked at first successful pass; reused for multi-round follow-up pass events. */
  lockedToken: string | null;
  connected: boolean;
}

export function createInitialGameState(): GameState {
  return {
    config: null,
    widgetId: null,
    gamePresentation: null,
    iframeHost: null,
    capClient: null,
    trigger: null,
    triggerCtx: null,
    gameStartedEmitted: false,
    gameErrored: false,
    lockedToken: null,
    connected: false,
  };
}
