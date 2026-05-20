export type ErrorCode =
  | 'invalid-config'
  | 'invalid-call'
  | 'verification-failed'
  | 'game-load-failed'
  | 'game-error-relayed';

export type ErrorSeverity = 'warn' | 'error';

/** Default severity per code. Customers can key off `event.detail.severity`
 *  to filter "the widget kept running" warnings from "something actually
 *  broke" errors without maintaining a hardcoded code-to-severity table. */
const DEFAULT_SEVERITY: Record<ErrorCode, ErrorSeverity> = {
  'invalid-config': 'warn',
  'invalid-call': 'warn',
  'verification-failed': 'error',
  'game-load-failed': 'error',
  'game-error-relayed': 'error',
};

const IFRAME_GAME_RELAY: ReadonlySet<string> = new Set([
  'game-error-relayed',
]);

const IFRAME_LOAD_RAW: ReadonlySet<string> = new Set([
  'iframe-load-failed',
  'iframe-script-blocked',
  'game-not-registered',
]);

export function mapIframeErrorCode(rawCode: string): { code: ErrorCode; originalCode?: string } {
  if (IFRAME_LOAD_RAW.has(rawCode)) {
    return { code: 'game-load-failed', originalCode: rawCode };
  }
  if (IFRAME_GAME_RELAY.has(rawCode)) {
    return { code: 'game-error-relayed' };
  }
  return { code: 'game-error-relayed', originalCode: rawCode };
}

export function fireError(
  el: HTMLElement,
  code: ErrorCode,
  message: string,
  originalCode?: string,
): void {
  const detail: { code: ErrorCode; message: string; severity: ErrorSeverity; originalCode?: string } = {
    code,
    message,
    severity: DEFAULT_SEVERITY[code],
  };
  if (originalCode !== undefined) detail.originalCode = originalCode;
  el.dispatchEvent(
    new CustomEvent('error', {
      detail,
      bubbles: true,
      composed: true,
    })
  );
}
