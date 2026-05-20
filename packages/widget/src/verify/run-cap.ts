import { setupCapSession, awaitCapAndEmitPass } from './cap-session.js';
import { emitStart } from './events.js';
import type { WidgetState } from './state.js';
import type { WidgetConfig } from '../config/widget.js';

/**
 * Cap-only verification path for `<caputchin-widget>` (modes invisible | simple).
 * No iframe, no game gating; cap.solve runs end-to-end and the wrapped
 * token is dispatched as the `pass` event.
 */
export async function runCap(el: HTMLElement, state: WidgetState<WidgetConfig>, apiHost: string): Promise<void> {
  if (!state.config) return;
  state.presentation?.setState('verifying');
  const { client, getWrappedToken } = setupCapSession(state, apiHost, state.config.sitekey);
  // No game payload to wait for; release the gate immediately so Cap's
  // redeem can proceed end-to-end.
  client.releaseGate({ score: null, durationMs: null });
  emitStart(el, null);
  await awaitCapAndEmitPass(el, state, client, getWrappedToken, state.presentation);
}
