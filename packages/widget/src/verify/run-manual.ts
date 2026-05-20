import { setupCapSession, awaitCapAndEmitPass } from './cap-session.js';
import { emitStart } from './events.js';
import type { WidgetState } from './state.js';
import type { GameConfig } from '../config/game.js';

/**
 * Manual orchestrator for `<caputchin-game trigger="manual">`; the customer
 * hosts the game UX in their own DOM (slotted into the layout chrome) and
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

  if (cfg.sitekey === null) {
    // Game-only manual: no cap, just an event shell.
    dispatchStart();
    return;
  }

  // Cap + manual: armed gate; customer releases via pass() or aborts via fail().
  const { client, getWrappedToken } = setupCapSession(state, apiHost, cfg.sitekey);
  dispatchStart();
  void awaitCapAndEmitPass(el, state, client, getWrappedToken, state.gamePresentation ?? null);
}
