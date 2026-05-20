import type { WidgetToIframe, IframeToWidget } from './messages.js';
import { isIframeToWidget } from './messages.js';

export function send(iframe: HTMLIFrameElement, msg: WidgetToIframe): void {
  // Sandboxed iframe has opaque origin "null". postMessage spec only accepts
  // "*", "/", or an absolute URL as targetOrigin; "null" is silently
  // dropped by modern browsers. The receiving runtime validates by
  // `event.source === window.parent` so "*" is safe here (no third party
  // can intercept; the sandbox blocks credential leakage either way).
  iframe.contentWindow?.postMessage(msg, '*');
}

export function listen(
  iframe: HTMLIFrameElement,
  _el: HTMLElement,
  cb: (msg: IframeToWidget) => void
): () => void {
  function handler(event: MessageEvent): void {
    if (event.source !== iframe.contentWindow) return;
    if (event.origin !== 'null') {
      // Defensive: sandboxed iframes always post from origin "null".
      // A non-"null" origin would indicate a sandbox-misconfiguration bug.
      console.warn(`[caputchin] ignored postMessage from unexpected origin: "${event.origin}"`);
      return;
    }
    if (!isIframeToWidget(event.data)) return;
    cb(event.data);
  }
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
