import { buildSrcdoc } from './srcdoc.js';
import { listen, send } from '../protocol/channel.js';
import type { IframeToWidget } from '../protocol/messages.js';

const LOAD_TIMEOUT_MS = 10_000;

export class IframeHost {
  private readonly gameUrl: string | null;
  private readonly integrity: string | null;
  private readonly gameId: string | null;
  private readonly onMessage: (msg: IframeToWidget) => void;
  private readonly hostEl: HTMLElement;

  private iframe: HTMLIFrameElement | null = null;
  private unlisten: (() => void) | null = null;
  private loadTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    gameUrl: string | null,
    integrity: string | null,
    gameId: string | null,
    hostEl: HTMLElement,
    onMessage: (msg: IframeToWidget) => void
  ) {
    this.gameUrl = gameUrl;
    this.integrity = integrity;
    this.gameId = gameId;
    this.hostEl = hostEl;
    this.onMessage = onMessage;
  }

  build(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.border = 'none';
    iframe.srcdoc = buildSrcdoc({
      gameId: this.gameId,
      gameUrl: this.gameUrl,
      integrity: this.integrity,
      runtimeJs: __IFRAME_RUNTIME__,
      runtimeSha256: __IFRAME_RUNTIME_SHA256__,
    });
    this.iframe = iframe;
    return iframe;
  }

  mount(
    container: HTMLElement,
    onLoadFailed: (code: 'iframe-load-failed', message: string) => void
  ): void {
    if (!this.iframe) this.build();
    const iframe = this.iframe!;

    this.unlisten = listen(iframe, this.hostEl, this.onMessage);

    this.loadTimer = setTimeout(() => {
      onLoadFailed('iframe-load-failed', 'Iframe load timed out after 10s');
    }, LOAD_TIMEOUT_MS);

    iframe.onload = () => {
      if (this.loadTimer !== null) {
        clearTimeout(this.loadTimer);
        this.loadTimer = null;
      }
    };

    iframe.onerror = () => {
      if (this.loadTimer !== null) {
        clearTimeout(this.loadTimer);
        this.loadTimer = null;
      }
      onLoadFailed('iframe-load-failed', 'Iframe failed to load');
    };

    container.appendChild(iframe);
  }

  kickoff(seq: number, sitekey: string, apiHost: string): void {
    if (!this.iframe) return;
    send(this.iframe, {
      kind: 'kickoff',
      seq,
      gameId: this.gameId,
      gameUrl: this.gameUrl,
      integrity: this.integrity,
      sitekey,
      apiHost,
    });
  }

  dispose(): void {
    if (this.loadTimer !== null) {
      clearTimeout(this.loadTimer);
      this.loadTimer = null;
    }
    if (this.iframe) {
      send(this.iframe, { kind: 'dispose', seq: -1 });
      this.iframe.remove();
      this.iframe = null;
    }
    if (this.unlisten) {
      this.unlisten();
      this.unlisten = null;
    }
  }
}
