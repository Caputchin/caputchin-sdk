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
  // Cap-only widget (no game) → gameId null → server verifies on cap-PoW alone.
  const { client, getWrappedToken } = setupCapSession(state, apiHost, state.config.sitekey, null);
  // No game/trace to wait for; release the gate immediately so Cap's redeem
  // can proceed end-to-end.
  client.releaseGate({});
  emitStart(el, null);
  await awaitCapAndEmitPass(el, state, client, getWrappedToken, state.presentation);
}
