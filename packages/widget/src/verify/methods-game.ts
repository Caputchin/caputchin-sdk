import { fireError } from '../errors.js';
import { emitPass } from './events.js';
import type { ManualPassPayload, ManualFailPayload } from './payload.js';
import { recordAdditionalRound } from './record-round.js';
import type { WidgetState } from './state.js';
import { shouldVerify } from '../config/game.js';
import type { GameConfig } from '../config/game.js';

/**
 * Public methods on `<caputchin-game>`. There is no `start()`; verification
 * auto-kicks on mount for inline (manual or iframe) and on the first
 * checkbox click for modal/fullscreen. `pass()` and `fail()` are the
 * customer's release/abort handles, only valid when `trigger="manual"`.
 *
 * Multi-round: customers can call `pass()` repeatedly to record higher
 * scores. First call releases the cap gate (token gets minted); subsequent
 * calls fire `/verify/pass` directly with the locked token via
 * `recordAdditionalRound`, mirroring the iframe game multi-round flow.
 */
export function installGameMethods(el: HTMLElement, state: WidgetState<GameConfig>, apiHost: string): void {
  Object.defineProperty(el, 'pass', {
    value: (payload?: ManualPassPayload): void => {
      if (!state.config) return;
      if (state.config.trigger !== 'manual') {
        fireError(el, 'invalid-call', 'pass() only callable when trigger="manual"');
        return;
      }
      const trace = typeof payload?.trace === 'string' ? payload.trace : '';

      if (!shouldVerify(state.config)) {
        // Game-only / no-verify manual: no cap to release, no replay. Pass/fail
        // only (the authoritative score lives server-side at /siteverify).
        emitPass(el, { token: null, score: null, durationMs: null });
        state.gamePresentation?.setState('verified');
        return;
      }

      // Cap + manual. Gate must already be armed (verification started). For
      // inline that happens on mount; for modal/fullscreen on first dialog
      // open. Premature calls would silently drop; surface as invalid-call.
      if (!state.capClient) {
        fireError(el, 'invalid-call', 'pass() called before verification started; open the dialog first');
        return;
      }

      if (!state.firstPassFired) {
        // First pass: release the cap gate. runManual's cap.solve().then will
        // emit the pass event once the wrapped token comes back from redeem.
        state.firstPassFired = true;
        state.capClient.releaseGate({ trace });
      } else {
        // Subsequent pass: record an additional round + emit the pass event
        // with the locked token. recordAdditionalRound silently no-ops if
        // lockedToken isn't set yet (race against cap.solve completion).
        void recordAdditionalRound(el, state, apiHost, { trace });
      }
    },
    configurable: true,
    writable: false,
    enumerable: false,
  });

  Object.defineProperty(el, 'fail', {
    value: (payload?: ManualFailPayload): void => {
      if (!state.config) return;
      if (state.config.trigger !== 'manual') {
        fireError(el, 'invalid-call', 'fail() only callable when trigger="manual"');
        return;
      }
      const code = typeof payload?.code === 'string' ? payload.code : 'game-failed';
      const message = typeof payload?.message === 'string' ? payload.message : 'Customer game reported failure';

      // Same guard as pass(): fail before verification started is meaningless
      // for the cap path. Game-only / no-verify manual has no cap gate so it's
      // always OK (relay straight through).
      if (shouldVerify(state.config) && !state.capClient) {
        fireError(el, 'invalid-call', 'fail() called before verification started; open the dialog first');
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
