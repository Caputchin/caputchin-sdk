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

const IFRAME_FORWARDABLE_CODES: ReadonlySet<ErrorCode> = new Set([
  'game-not-registered',
  'iframe-script-blocked',
  'game-error-relayed',
]);

export function mapIframeErrorCode(rawCode: string): { code: ErrorCode; originalCode?: string } {
  if (IFRAME_FORWARDABLE_CODES.has(rawCode as ErrorCode)) {
    return { code: rawCode as ErrorCode };
  }
  return { code: 'game-error-relayed', originalCode: rawCode };
}

export function fireError(
  el: HTMLElement,
  code: ErrorCode,
  message: string,
  originalCode?: string,
): void {
  const detail: { code: ErrorCode; message: string; originalCode?: string } = { code, message };
  if (originalCode !== undefined) detail.originalCode = originalCode;
  el.dispatchEvent(
    new CustomEvent('error', {
      detail,
      bubbles: true,
      composed: true,
    })
  );
}
