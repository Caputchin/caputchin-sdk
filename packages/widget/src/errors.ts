export type ErrorCode =
  | 'invalid-config'
  | 'resolve-failed'
  | 'iframe-load-failed'
  | 'iframe-script-blocked'
  | 'game-not-registered'
  | 'game-error-relayed'
  | 'postmessage-bad-origin'
  | 'cap-solve-failed'
  | 'cap-redeem-failed'
  | 'form-not-found';

export const RECOVERABLE: Record<ErrorCode, boolean> = {
  'invalid-config': false,
  'resolve-failed': false,
  'iframe-load-failed': false,
  'iframe-script-blocked': false,
  'game-not-registered': false,
  'game-error-relayed': false,
  'postmessage-bad-origin': true,
  'cap-solve-failed': true,
  'cap-redeem-failed': true,
  'form-not-found': false,
};

export function fireError(el: HTMLElement, code: ErrorCode, message: string): void {
  el.dispatchEvent(
    new CustomEvent('error', {
      detail: { code, message },
      bubbles: true,
      composed: true,
    })
  );
}
