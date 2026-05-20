/** Tiny helpers for the four customer-facing CustomEvents fired across the
 *  runners. Each dispatchEvent is bubbled + composed so the event escapes
 *  the shadow root onto the host element's event surface. */

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
