/** Tiny helpers for the customer-facing CustomEvents fired across the
 *  runners. Each dispatchEvent is bubbled + composed so the event escapes
 *  the shadow root onto the host element's event surface. */

import type { DegradeReason } from '../bootstrap/types.js';

/** The bootstrap resolve failed / timed out, so the widget rendered with its
 *  bundled defaults instead of the server-resolved size / skin / locale. NOT an
 *  error - the widget is fully functional, just possibly off-size or off-theme.
 *  Fired on its own `degraded` channel (kept off the `error` event so customer
 *  error handlers don't treat a slow service as a failure); `detail.reason`
 *  tells telemetry why. */
export function emitDegraded(el: HTMLElement, reason: DegradeReason): void {
  el.dispatchEvent(new CustomEvent('degraded', {
    detail: { reason },
    bubbles: true,
    composed: true,
  }));
}

export function emitStart(el: HTMLElement, gameId: string | null): void {
  el.dispatchEvent(new CustomEvent('start', {
    detail: { gameId },
    bubbles: true,
    composed: true,
  }));
}

export function emitPass(
  el: HTMLElement,
  detail: { token: string | null; score: number | null; durationMs: number | null },
): void {
  el.dispatchEvent(new CustomEvent('pass', {
    detail,
    bubbles: true,
    composed: true,
  }));
}

export function emitDialogShown(el: HTMLElement, layout: 'modal' | 'fullscreen'): void {
  el.dispatchEvent(new CustomEvent('dialog-shown', {
    detail: { layout },
    bubbles: true,
    composed: true,
  }));
}

export function emitDialogHidden(el: HTMLElement, layout: 'modal' | 'fullscreen'): void {
  el.dispatchEvent(new CustomEvent('dialog-hidden', {
    detail: { layout },
    bubbles: true,
    composed: true,
  }));
}
