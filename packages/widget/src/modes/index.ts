import type { WidgetTrigger, WidgetWidth, WidgetHeight, WidgetSize } from '../config/shared.js';
import { createInvisiblePresentation } from './invisible.js';
import { createSimplePresentation } from './simple.js';

export type PresentationState = 'idle' | 'verifying' | 'verified' | 'error';

export interface Presentation {
  /** Build any DOM into the widget shadow root or host. Called once. */
  mount(): void;
  /** Tear down DOM + listeners. Called on widget disconnect. */
  unmount(): void;
  /** Visual state feedback. */
  setState(state: PresentationState): void;
  /**
   * Register a user-activation handler (e.g. checkbox click). Presentations
   * with no clickable surface (invisible, simple-pill) return a no-op cleanup.
   * The `click` trigger relies on this; other triggers ignore it.
   */
  onActivate(handler: () => void): () => void;
}

export interface PresentationFactoryInput {
  /** The custom-element host (used for host-level styling like full-width). */
  host: HTMLElement;
  /** Where to append DOM — shadow root by default; isolated from page CSS. */
  root: ShadowRoot;
  trigger: WidgetTrigger;
  width: WidgetWidth;
  /** Explicit pixel height. `null` means "auto" — fit to content. Applied to
   *  the host element so the brand strip can fill it. Game widget plumbs its
   *  own height into the iframe; cap-widget uses this only for simple mode. */
  height?: WidgetHeight;
  size: WidgetSize;
}

/**
 * Lightweight presentations for the cap widget. `invisible=true` mounts no
 * DOM; default mounts the checkbox + brand strip. Game presentation lives
 * in `./game.ts` (consumed by `<caputchin-game>`).
 */
export function createPresentation(invisible: boolean, input: PresentationFactoryInput): Presentation {
  return invisible ? createInvisiblePresentation() : createSimplePresentation(input);
}
