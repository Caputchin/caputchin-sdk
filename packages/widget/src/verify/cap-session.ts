import { createCapClient, type CapClient } from '../cap/client.js';
import { fireError } from '../errors.js';
import { emitPass } from './events.js';
import { injectTokenIntoEnclosingForm } from './form.js';
import { makeWidgetId } from './id.js';
import type { WidgetState } from './state.js';
import type { WrappedToken } from '../token.js';

/**
 * Facade over the cap client lifecycle. Two helpers cover the boilerplate
 * shared by every runner (run-cap, run-manual, run-game):
 *
 *   1. `setupCapSession`; build the per-widget id + session context + cap
 *      client; wire onto state; return a closure to read the wrapped token
 *      once redeem completes.
 *   2. `awaitCapAndEmitPass`; wait for cap.solve; on success inject the
 *      token into the enclosing form, set verified state, lock the token,
 *      and emit the pass event. On failure / aborted gate, fire the
 *      appropriate error and set error state.
 *
 * Runners differ on how the gate gets released (immediately vs via iframe
 * postMessage vs via customer pass() method); that's the "strategy"
 * portion left to each caller. Everything else flows through here.
 */

export interface CapSessionHandle {
  client: CapClient;
  getWrappedToken: () => WrappedToken | null;
}

/** Build a cap session and wire it onto `state.capClient` (+ triggerCtx if
 *  present). Returns the client + a closure for the wrapped token. */
export function setupCapSession(
  state: WidgetState,
  apiHost: string,
  sitekey: string,
): CapSessionHandle {
  let wrappedToken: WrappedToken | null = null;
  const sessionCtx = {
    platform: { sitekey, score: null, durationMs: null } as Record<string, unknown>,
    onWrappedToken: (token: WrappedToken) => { wrappedToken = token; },
  };

  // Per-widget id encoded into the Cap library's apiEndpoint path so the
  // custom-fetch router can attach session context without any shared
  // mutable state. 50 widgets solve in parallel; no queue, no race.
  if (!state.widgetId) state.widgetId = makeWidgetId();
  const client = createCapClient(state.widgetId, apiHost, sessionCtx);
  state.capClient = client;
  if (state.triggerCtx) state.triggerCtx.capClient = client;

  return { client, getWrappedToken: () => wrappedToken };
}

/** Await cap.solve and complete the verification: inject token into form,
 *  setState verified, lock token, emit pass event. Handles the standard
 *  failure paths (solve threw, no wrapped token, game-errored guard).
 *
 *  `presentation` is whichever Presentation the runner has live (cap's
 *  invisible/simple, or the game's GamePresentation). The pass event
 *  carries the same shape regardless. */
export async function awaitCapAndEmitPass(
  el: HTMLElement,
  state: WidgetState,
  client: CapClient,
  getWrappedToken: () => WrappedToken | null,
  presentation: { setState: (s: 'verifying' | 'verified' | 'error' | 'idle') => void } | null,
): Promise<void> {
  try {
    await client.solve();
  } catch (err) {
    if (!state.gameErrored) {
      fireError(el, 'verification-failed', String(err), 'cap-solve-failed');
    }
    presentation?.setState('error');
    return;
  }

  if (state.gameErrored) {
    presentation?.setState('error');
    return;
  }

  const wrappedToken = getWrappedToken();
  if (!wrappedToken) {
    fireError(el, 'verification-failed', 'No wrapped token received from platform', 'cap-redeem-failed');
    presentation?.setState('error');
    return;
  }

  const { token, score, durationMs } = wrappedToken;
  injectTokenIntoEnclosingForm(el, token);
  presentation?.setState('verified');
  state.lockedToken = token;
  emitPass(el, { token, score, durationMs });
}
