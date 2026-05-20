import type { WidgetConfig } from '../config/widget.js';
import type { CapClient } from '../cap/client.js';
import type { Presentation } from '../modes/index.js';
import type { TriggerStrategy, TriggerContext } from '../triggers/index.js';

/** Per-mount state for `<caputchin-widget>` (cap only). */
export interface WidgetState {
  config: WidgetConfig | null;
  widgetId: string | null;
  presentation: Presentation | null;
  capClient: CapClient | null;
  trigger: TriggerStrategy | null;
  triggerCtx: TriggerContext | null;
  lockedToken: string | null;
  connected: boolean;
}

export function createInitialWidgetState(): WidgetState {
  return {
    config: null,
    widgetId: null,
    presentation: null,
    capClient: null,
    trigger: null,
    triggerCtx: null,
    lockedToken: null,
    connected: false,
  };
}
