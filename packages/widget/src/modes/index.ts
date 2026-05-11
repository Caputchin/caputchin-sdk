import type { CapClient } from '../cap/client.js';
import type { WidgetMode } from '../config.js';
import { createAutoMode } from './auto.js';
import { createFormSubmitMode } from './form-submit.js';
import { createManualMode } from './manual.js';

export interface VerificationContext {
  sitekey: string;
  gameId: string | null;
  gameUrl: string | null;
  integrity: string | null;
  apiHost: string;
  capClient: CapClient | null;
}

export interface ModeStrategy {
  activate(ctx: VerificationContext): void;
  deactivate(): void;
}

export function createModeStrategy(
  mode: WidgetMode,
  el: HTMLElement,
  runVerification: () => Promise<void>
): ModeStrategy {
  switch (mode) {
    case 'auto':
      return createAutoMode(runVerification);
    case 'form-submit':
      return createFormSubmitMode(el, runVerification);
    case 'manual':
      return createManualMode(el, runVerification);
  }
}
