import { getSessionId } from '../cap/custom-fetch.js';
import { emitPass } from './events.js';
import type { WidgetState } from './state.js';

/**
 * Multi-round path: cap.solve already minted the token. Subsequent
 * `bridge.pass()` calls from the iframe game (or customer `widget.pass()`
 * in manual mode) record additional rounds; fire `/verify/pass` directly
 * with the existing sessionId + new payload, then emit a follow-up `pass`
 * event reusing the locked token.
 *
 * Silently no-ops if `widgetId` or `lockedToken` aren't set yet (race:
 * pass called before cap.solve completed). Customers normally wait for
 * the first `pass` event before scoring again.
 */
export async function recordAdditionalRound(
  el: HTMLElement,
  state: WidgetState,
  apiHost: string,
  payload: { score: number | null; durationMs: number | null },
): Promise<void> {
  const { widgetId, lockedToken } = state;
  if (!widgetId || !lockedToken) return;
  const sessionId = getSessionId(widgetId);
  if (!sessionId) return;
  const { score, durationMs } = payload;
  try {
    await window.fetch(`${apiHost}/api/v1/verify/pass`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ platform: { sessionId, score, durationMs } }),
    });
  } catch {
    // best-effort scoreboard recording; fire the pass event regardless
  }
  emitPass(el, { token: lockedToken, score, durationMs });
}
