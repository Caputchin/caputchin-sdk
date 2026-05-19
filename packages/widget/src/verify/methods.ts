import { fireError } from '../errors.js';
import type { WidgetState } from './state.js';

/**
 * Define the public methods (`start`, `pass`, `setNickname`) on the element.
 * Called early in `connectedCallback` so they exist even when the widget is
 * inert (missing sitekey, etc.). Methods close over the live `state` ref —
 * field updates land before the method body runs.
 */
export function installMethods(el: HTMLElement, state: WidgetState): void {
  Object.defineProperty(el, 'start', {
    value: (): void => {
      if (!state.config) return;
      if (state.config.mode === 'game-only') {
        fireError(el, 'invalid-call', 'start() not applicable in mode="game-only"');
        return;
      }
      state.trigger?.forceStart?.(state.triggerCtx!);
    },
    configurable: true,
    writable: false,
    enumerable: false,
  });

  Object.defineProperty(el, 'pass', {
    value: (payload?: { score?: number | null; durationMs?: number | null }): void => {
      if (!state.config) return;
      const inGameManual = state.config.mode === 'game' && state.config.trigger === 'manual';
      if (!inGameManual) {
        fireError(el, 'invalid-call', 'pass() only callable in mode="game" trigger="manual"');
        return;
      }
      const score = typeof payload?.score === 'number' ? payload.score : null;
      const durationMs = typeof payload?.durationMs === 'number' ? payload.durationMs : null;
      state.triggerCtx?.releaseManualPass({ score, durationMs });
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
