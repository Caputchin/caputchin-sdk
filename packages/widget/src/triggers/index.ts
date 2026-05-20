import type { CapClient } from '../cap/client.js';
import type { WidgetTrigger } from '../config/shared.js';
import type { Presentation } from '../modes/index.js';
import { createAutoTrigger } from './auto.js';
import { createClickTrigger } from './click.js';
import { createFormSubmitTrigger } from './form-submit.js';
import { createManualTrigger } from './manual.js';

export interface TriggerContext {
  el: HTMLElement;
  presentation: Presentation;
  runVerification: () => Promise<void>;
  capClient: CapClient | null;
}

export interface TriggerStrategy {
  activate(ctx: TriggerContext): void;
  deactivate(): void;
  /**
   * Customer-callable `widget.start()`. For triggers that already auto-fire
   * (auto / form-submit / click), this is an idempotent force-start.
   */
  forceStart?(ctx: TriggerContext): void;
}

export function createTriggerStrategy(trigger: WidgetTrigger): TriggerStrategy {
  switch (trigger) {
    case 'auto':
      return createAutoTrigger();
    case 'click':
      return createClickTrigger();
    case 'form-submit':
      return createFormSubmitTrigger();
    case 'manual':
      return createManualTrigger();
  }
}
