import type { WidgetState } from './state.js';
import type { WidgetConfig } from '../config/widget.js';

/**
 * Public methods on `<caputchin-widget>`. Called early in `connectedCallback`
 * so they exist even when the widget is inert (missing sitekey). Closures
 * read the live `state` ref — fields nulled on disconnect (see element).
 *
 * `setNickname` is not exposed here — scoreboards are game-only. See
 * `<caputchin-game>` for the scoreboard surface.
 */
export function installWidgetMethods(el: HTMLElement, state: WidgetState<WidgetConfig>): void {
  Object.defineProperty(el, 'start', {
    value: (): void => {
      if (!state.config) return;
      state.trigger?.forceStart?.(state.triggerCtx!);
    },
    configurable: true,
    writable: false,
    enumerable: false,
  });
}
