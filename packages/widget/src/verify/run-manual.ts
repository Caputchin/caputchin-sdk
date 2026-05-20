import { createCapClient } from '../cap/client.js';
import { fireError } from '../errors.js';
import { injectHiddenInput } from '../form.js';
import type { WrappedToken } from '../token.js';
import type { WidgetState } from './state.js';
import type { GameConfig } from '../config/game.js';
import { makeWidgetId } from './id.js';

/**
 * Manual orchestrator for `<caputchin-game trigger="manual">` — the customer
 * hosts the game UX in their own DOM (slotted into the layout chrome) and
 * drives completion via `widget.pass({ score, durationMs })` /
 * `widget.fail({ code, message })`. No iframe mounts.
 *
 * With sitekey: cap.solve runs in parallel; pass releases the gate with the
 *   game payload (via methods-game's pass() → capClient.releaseGate), fail
 *   aborts (via methods-game's fail() → capClient.abortGate).
 * Without sitekey: pure event shell — start/pass/error fire, no cap.
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
    el.dispatchEvent(new CustomEvent('start', {
      detail: { gameId: null },
      bubbles: true,
      composed: true,
    }));
  };

  if (cfg.sitekey === null) {
    // Game-only manual: no cap, just an event shell. start fires immediately;
    // pass / fail flow through methods → handlers in the element.
    dispatchStart();
    return;
  }

  // Cap + manual: armed gate; customer releases via pass() or aborts via fail().
  let wrappedToken: WrappedToken | null = null;
  const sessionCtx = {
    platform: { sitekey: cfg.sitekey, score: null as unknown, durationMs: null as unknown } as Record<string, unknown>,
    onWrappedToken: (token: WrappedToken) => { wrappedToken = token; },
  };

  if (!state.widgetId) state.widgetId = makeWidgetId();
  const client = createCapClient(state.widgetId, apiHost, sessionCtx);
  state.capClient = client;
  if (state.triggerCtx) state.triggerCtx.capClient = client;

  dispatchStart();

  client.solve()
    .then(() => {
      if (state.gameErrored) {
        state.gamePresentation?.setState('error');
        return;
      }
      if (!wrappedToken) {
        fireError(el, 'verification-failed', 'No wrapped token received from platform', 'cap-redeem-failed');
        state.gamePresentation?.setState('error');
        return;
      }
      const { token, score, durationMs } = wrappedToken;
      const form = el.closest('form');
      if (form instanceof HTMLFormElement) {
        injectHiddenInput(form, token);
      }
      state.gamePresentation?.setState('verified');
      state.lockedToken = token;
      el.dispatchEvent(new CustomEvent('pass', {
        detail: { token, score, durationMs },
        bubbles: true,
        composed: true,
      }));
    })
    .catch((err) => {
      if (!state.gameErrored) {
        fireError(el, 'verification-failed', String(err), 'cap-solve-failed');
      }
      state.gamePresentation?.setState('error');
    });
}
