import { getSessionId } from '../cap/custom-fetch.js';

/**
 * Multi-round path: cap.solve already minted the token. Subsequent
 * `bridge.pass()` calls from the iframe game record additional rounds —
 * fire `/verify/pass` directly with the existing sessionId + new payload,
 * then emit a follow-up `pass` event reusing the locked token.
 */
export async function recordAdditionalRound(
  el: HTMLElement,
  widgetId: string | null,
  lockedToken: string | null,
  apiHost: string,
  score: number | null,
  durationMs: number | null,
): Promise<void> {
  if (!widgetId || !lockedToken) return;
  const sessionId = getSessionId(widgetId);
  if (!sessionId) return;
  try {
    await window.fetch(`${apiHost}/api/v1/verify/pass`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ platform: { sessionId, score, durationMs } }),
    });
  } catch {
    // best-effort scoreboard recording — fire the pass event regardless
  }
  el.dispatchEvent(new CustomEvent('pass', {
    detail: { token: lockedToken, score, durationMs },
    bubbles: true,
    composed: true,
  }));
}
