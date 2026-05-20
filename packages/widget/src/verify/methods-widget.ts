import type { WidgetState } from './state-widget.js';

/**
 * Public methods on `<caputchin-widget>`. Called early in `connectedCallback`
 * so they exist even when the widget is inert (missing sitekey). Closures
 * read the live `state` ref — fields nulled on disconnect (see element).
 */
export function installWidgetMethods(el: HTMLElement, state: WidgetState): void {
  Object.defineProperty(el, 'start', {
    value: (): void => {
      if (!state.config) return;
      state.trigger?.forceStart?.(state.triggerCtx!);
    },
    configurable: true,
    writable: false,
    enumerable: false,
  });

  Object.defineProperty(el, 'setNickname', {
    value: (_letters: string): void => {
      throw new Error('setNickname is not implemented in this build (Post-MVP)');
    },
    configurable: true,
    writable: false,
    enumerable: false,
  });
}
