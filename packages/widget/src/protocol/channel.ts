import type { WidgetToIframe, IframeToWidget } from './messages.js';
import { isIframeToWidget } from './messages.js';
import { fireError } from '../errors.js';

export function send(iframe: HTMLIFrameElement, msg: WidgetToIframe): void {
  iframe.contentWindow?.postMessage(msg, '*');
}

export function listen(
  iframe: HTMLIFrameElement,
  el: HTMLElement,
  cb: (msg: IframeToWidget) => void
): () => void {
  function handler(event: MessageEvent): void {
    if (event.source !== iframe.contentWindow) return;
    if (event.origin !== 'null') {
      fireError(el, 'postmessage-bad-origin', `Unexpected message origin: "${event.origin}"`);
      return;
    }
    if (!isIframeToWidget(event.data)) return;
    cb(event.data);
  }
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
