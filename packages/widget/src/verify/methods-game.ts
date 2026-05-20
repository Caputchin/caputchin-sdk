import { fireError } from '../errors.js';
import type { GameState } from './state-game.js';

/**
 * Public methods on `<caputchin-game>`. In iframe mode (auto-derived
 * trigger), `pass()` and `fail()` are misplaced — the iframe drives the
 * outcome via postMessage. In `trigger="manual"` they're the customer's
 * release / abort handles.
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

      // Cap + manual: release the gate. run-manual's cap.solve().then will
      // emit the pass event with the wrapped token once redeem returns.
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

      state.gameErrored = true;
      fireError(el, 'game-error-relayed', message, code);
      if (state.config.sitekey !== null) {
        state.capClient?.abortGate(new Error(`game-failed: ${code}`));
      }
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
