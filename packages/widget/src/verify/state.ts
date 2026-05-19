import type { ParsedConfig } from '../config.js';
import type { CapClient } from '../cap/client.js';
import type { IframeHost } from '../iframe/host.js';
import type { Presentation } from '../modes/index.js';
import type { GamePresentation } from '../modes/game.js';
import type { TriggerStrategy, TriggerContext } from '../triggers/index.js';

/**
 * Mutable per-mount state for a single widget. Owned by `CaputchinElement`,
 * threaded through `verify/*` helpers so the element class stays a thin
 * lifecycle shell. Reset on `disconnectedCallback`.
 */
export interface WidgetState {
  config: ParsedConfig | null;
  widgetId: string | null;
  presentation: Presentation | null;
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

export function createInitialState(): WidgetState {
  return {
    config: null,
    widgetId: null,
    presentation: null,
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
