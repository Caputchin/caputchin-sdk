import { createCapClient } from '../cap/client.js';
import { fireError } from '../errors.js';
import { injectHiddenInput } from '../form.js';
import type { WrappedToken } from '../token.js';
import type { WidgetState } from './state.js';
import type { WidgetConfig } from '../config/widget.js';
import { makeWidgetId } from './id.js';

/**
 * Cap-only verification path for `<caputchin-widget>` (modes invisible | simple).
 * No iframe, no game gating — cap.solve runs end-to-end and the wrapped
 * token is dispatched as the `pass` event.
 */
export async function runCap(el: HTMLElement, state: WidgetState<WidgetConfig>, apiHost: string): Promise<void> {
  if (!state.config) return;
  const cfg = state.config;

  state.presentation?.setState('verifying');

  let wrappedToken: WrappedToken | null = null;
  const sessionCtx = {
    platform: { sitekey: cfg.sitekey, score: null as unknown, durationMs: null as unknown } as Record<string, unknown>,
    onWrappedToken: (token: WrappedToken) => { wrappedToken = token; },
  };

  // Per-widget id encoded into the Cap library's apiEndpoint path so the
  // custom-fetch router can attach session context without any shared
  // mutable state. 50 widgets solve in parallel; no queue, no race.
  if (!state.widgetId) state.widgetId = makeWidgetId();
  const client = createCapClient(state.widgetId, apiHost, sessionCtx);
  state.capClient = client;
  if (state.triggerCtx) state.triggerCtx.capClient = client;

  // No game payload to wait for — release the gate immediately so Cap's
  // redeem can proceed end-to-end.
  client.releaseGate({ score: null, durationMs: null });

  el.dispatchEvent(new CustomEvent('start', {
    detail: { gameId: null },
    bubbles: true,
    composed: true,
  }));

  try {
    await client.solve();
  } catch (err) {
    fireError(el, 'verification-failed', String(err), 'cap-solve-failed');
    state.presentation?.setState('error');
    return;
  }

  if (!wrappedToken) {
    fireError(el, 'verification-failed', 'No wrapped token received from platform', 'cap-redeem-failed');
    state.presentation?.setState('error');
    return;
  }

  const { token, score, durationMs } = wrappedToken;

  const form = el.closest('form');
  if (form instanceof HTMLFormElement) {
    injectHiddenInput(form, token);
  }

  state.presentation?.setState('verified');
  state.lockedToken = token;
  el.dispatchEvent(new CustomEvent('pass', {
    detail: { token, score, durationMs },
    bubbles: true,
    composed: true,
  }));
}
