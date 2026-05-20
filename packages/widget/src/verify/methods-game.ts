import { fireError } from '../errors.js';
import type { GameState } from './state-game.js';

/**
 * Public methods on `<caputchin-game>`. `pass()` is only meaningful for
 * `trigger="manual"` with a sitekey (customer-hosted game). Without a
 * sitekey the widget is game-only and `pass()` fires an `invalid-call`
 * error event.
 */
export function installGameMethods(el: HTMLElement, state: GameState): void {
  Object.defineProperty(el, 'start', {
    value: (): void => {
      if (!state.config) return;
      state.trigger?.forceStart?.(state.triggerCtx!);
    },
    configurable: true,
    writable: false,
    enumerable: false,
  });

  Object.defineProperty(el, 'pass', {
    value: (payload?: { score?: number | null; durationMs?: number | null }): void => {
      if (!state.config) return;
      const inManualVerify = state.config.trigger === 'manual' && state.config.sitekey !== null;
      if (!inManualVerify) {
        fireError(el, 'invalid-call', 'pass() only callable with sitekey + trigger="manual"');
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
