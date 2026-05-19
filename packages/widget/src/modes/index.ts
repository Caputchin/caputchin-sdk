import type { WidgetMode, WidgetTrigger } from '../config.js';
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
  el: HTMLElement;
  trigger: WidgetTrigger;
}

/**
 * Lightweight presentations only (invisible, simple). The `game` and
 * `game-only` modes are orchestrated directly in element.ts because they
 * reuse the IframeHost + LayoutPresenter machinery already there.
 */
export function createPresentation(mode: WidgetMode, input: PresentationFactoryInput): Presentation | null {
  switch (mode) {
    case 'invisible':
      return createInvisiblePresentation();
    case 'simple':
      return createSimplePresentation(input);
    case 'game':
    case 'game-only':
      return null;
  }
}
