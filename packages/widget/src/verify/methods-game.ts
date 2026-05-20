import { fireError } from '../errors.js';
import type { GameState } from './state-game.js';

/**
 * Public methods on `<caputchin-game>`. There is no `start()` — verification
 * auto-kicks on mount for inline (manual or iframe) and on the first
 * checkbox click for modal/fullscreen. `pass()` and `fail()` are the
 * customer's release/abort handles, only valid when `trigger="manual"`.
 */
export function installGameMethods(el: HTMLElement, state: GameState): void {
  Object.defineProperty(el, 'pass', {
    value: (payload?: { score?: number | null; durationMs?: number | null }): void => {
      if (!state.config) return;
      if (state.config.trigger !== 'manual') {
        fireError(el, 'invalid-call', 'pass() only callable when trigger="manual"');
        return;
      }
      const score = typeof payload?.score === 'number' ? payload.score : null;
      const durationMs = typeof payload?.durationMs === 'number' ? payload.durationMs : null;

      if (state.config.sitekey === null) {
        // Game-only manual: no cap to release; just fire the pass event.
        el.dispatchEvent(new CustomEvent('pass', {
          detail: { token: null, score, durationMs },
          bubbles: true,
          composed: true,
        }));
        state.gamePresentation?.setState('verified');
        return;
      }

      // Cap + manual: gate must already be armed (verification started). For
      // inline that happens on mount; for modal/fullscreen on first dialog
      // open. Customers calling pass() before the entry click would silently
      // drop without this guard — surface as invalid-call so they see it.
      if (!state.capClient) {
        fireError(el, 'invalid-call', 'pass() called before verification started — open the dialog first');
        return;
      }
      state.triggerCtx?.releaseManualPass({ score, durationMs });
    },
    configurable: true,
    writable: false,
    enumerable: false,
  });

  Object.defineProperty(el, 'fail', {
    value: (payload?: { code?: string; message?: string }): void => {
      if (!state.config) return;
      if (state.config.trigger !== 'manual') {
        fireError(el, 'invalid-call', 'fail() only callable when trigger="manual"');
        return;
      }
      const code = typeof payload?.code === 'string' ? payload.code : 'game-failed';
      const message = typeof payload?.message === 'string' ? payload.message : 'Customer game reported failure';

      // Same guard as pass(): fail before verification started is meaningless
      // for the cap path. Game-only manual has no cap gate so it's always OK.
      if (state.config.sitekey !== null && !state.capClient) {
        fireError(el, 'invalid-call', 'fail() called before verification started — open the dialog first');
        return;
      }

      state.gameErrored = true;
      fireError(el, 'game-error-relayed', message, code);
      state.capClient?.abortGate(new Error(`game-failed: ${code}`));
      state.gamePresentation?.setState('error');
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
