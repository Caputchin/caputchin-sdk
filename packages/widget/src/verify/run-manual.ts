import { setupCapSession, awaitCapAndEmitPass } from './cap-session.js';
import { emitStart } from './events.js';
import { resolveGameId } from './id.js';
import type { WidgetState } from './state.js';
import { shouldVerify } from '../config/game.js';
import type { GameConfig } from '../config/game.js';

/**
 * Manual orchestrator for `<caputchin-game trigger="manual">`; the customer
 * hosts the game UX in their own DOM (slotted into the layout shell) and
 * drives completion via `widget.pass({ score, durationMs })` /
 * `widget.fail({ code, message })`. No iframe mounts.
 *
 * With sitekey: cap.solve runs in parallel; pass releases the gate with the
 *   game payload (via methods-game's pass() → capClient.releaseGate), fail
 *   aborts (via methods-game's fail() → capClient.abortGate).
 * Without sitekey: pure event shell; start fires immediately; pass / fail
 *   flow through methods-game and emit events directly.
 */
export function runManual(
  el: HTMLElement,
  state: WidgetState<GameConfig>,
  apiHost: string,
): void {
  if (!state.config) return;
  const cfg = state.config;

  state.gamePresentation?.setState('verifying');

  const dispatchStart = (): void => {
    if (state.gameStartedEmitted) return;
    state.gameStartedEmitted = true;
    emitStart(el, null);
  };

  if (!shouldVerify(cfg)) {
    // Game-only / no-verify manual: no cap, just an event shell.
    dispatchStart();
    return;
  }

  // Cap + manual: armed gate; customer releases via pass({trace}) or aborts via
  // fail(). gameId → /verify/start so the server stores it + gates replay. NOTE:
  // the customer-hosted game must run under the issued seed for its trace to
  // replay — exposing the seed to the manual game is a follow-up (the iframe
  // path is the supported replay path at MVP).
  const { client, getWrappedToken } = setupCapSession(state, apiHost, cfg.sitekey!, resolveGameId(cfg));
  dispatchStart();
  void awaitCapAndEmitPass(el, state, client, getWrappedToken, state.gamePresentation ?? null);
}
