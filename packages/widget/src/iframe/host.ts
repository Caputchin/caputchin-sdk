import { buildSrcdoc } from './srcdoc.js';
import { listen, send } from '../protocol/channel.js';
import type { IframeToWidget, ManifestMessage } from '../protocol/messages.js';
import type { Layout } from '@caputchin/game-sdk';

// srcdoc iframes always fire `load` for the wrapper document — even on CSP block or 404.
// The real readiness signal is `game-started` postMessage from the runtime.
const KICKOFF_ACK_TIMEOUT_MS = 10_000;

export class IframeHost {
  private readonly gameUrl: string | null;
  private readonly integrity: string | null;
  private readonly gameId: string | null;
  private readonly onMessage: (msg: IframeToWidget) => void;
  private readonly hostEl: HTMLElement;

  private iframe: HTMLIFrameElement | null = null;
  private unlisten: (() => void) | null = null;
  private kickoffAckTimer: ReturnType<typeof setTimeout> | null = null;
  private onLoadFailed: ((code: 'iframe-load-failed', message: string) => void) | null = null;
  /** When true, iframe width tracks reported content width. False = iframe stays width:100% of slot. */
  private autoWidth = true;

  private manifestResolver: ((m: ManifestMessage | null) => void) | null = null;
  private manifestTimer: ReturnType<typeof setTimeout> | null = null;
  private manifestSettled = false;
  private bufferedManifest: ManifestMessage | null = null;

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
    // Hidden until first `resize` message lands so the spec-default 300×150
    // never paints to the user. Start at a roomy 800×600 (hidden) so the
    // game's content can lay out naturally — at a tiny viewport, text wraps
    // and `scrollWidth/scrollHeight` reports the wrapped size, not the
    // natural content size. After the runtime reports actual dimensions
    // we snap the iframe to match.
    iframe.style.visibility = 'hidden';
    iframe.style.display = 'block';
    iframe.style.width = '800px';
    iframe.style.height = '600px';
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

  /** Switch off auto-width when the parent layout wants a fixed/full-width iframe. */
  setAutoWidth(auto: boolean): void {
    this.autoWidth = auto;
    if (!auto && this.iframe) {
      this.iframe.style.width = '100%';
    }
  }

  mount(
    container: HTMLElement,
    onLoadFailed: (code: 'iframe-load-failed', message: string) => void,
    onGameStarted?: () => void
  ): void {
    if (!this.iframe) this.build();
    const iframe = this.iframe!;

    this.onLoadFailed = onLoadFailed;

    this.unlisten = listen(iframe, this.hostEl, (msg) => {
      if (msg.kind === 'manifest') {
        this.handleManifest(msg);
        return;
      }
      if (msg.kind === 'resize') {
        this.applyResize(msg.width, msg.height);
        return;
      }
      if (msg.kind === 'game-started') {
        this.clearKickoffAckTimer();
        onGameStarted?.();
      }
      this.onMessage(msg);
    });

    container.appendChild(iframe);
  }

  /** Returns the iframe element for re-parenting by external presenters. */
  getIframe(): HTMLIFrameElement | null {
    return this.iframe;
  }

  private applyResize(width: number, height: number): void {
    if (!this.iframe) return;
    this.iframe.style.height = `${height}px`;
    if (this.autoWidth) this.iframe.style.width = `${width}px`;
    // First resize message reveals the iframe — defaults (300×150) never paint.
    if (this.iframe.style.visibility === 'hidden') {
      this.iframe.style.visibility = 'visible';
    }
  }

  /**
   * Wait for the iframe runtime to post its manifest. Resolves to the message
   * if received within `timeoutMs`, or `null` on timeout. Safe to call multiple
   * times — subsequent calls reuse the buffered manifest.
   */
  waitManifest(timeoutMs: number): Promise<ManifestMessage | null> {
    if (this.bufferedManifest) {
      return Promise.resolve(this.bufferedManifest);
    }
    if (this.manifestSettled) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      this.manifestResolver = resolve;
      this.manifestTimer = setTimeout(() => {
        this.manifestTimer = null;
        this.settleManifest(null);
      }, timeoutMs);
    });
  }

  private handleManifest(msg: ManifestMessage): void {
    if (this.manifestSettled) return;
    if (this.manifestResolver) {
      this.settleManifest(msg);
    } else {
      this.bufferedManifest = msg;
    }
  }

  private settleManifest(msg: ManifestMessage | null): void {
    if (this.manifestSettled) return;
    this.manifestSettled = true;
    if (this.manifestTimer !== null) {
      clearTimeout(this.manifestTimer);
      this.manifestTimer = null;
    }
    if (this.manifestResolver) {
      this.manifestResolver(msg);
      this.manifestResolver = null;
    }
  }

  setLayoutContext(layout: Layout): void {
    if (!this.iframe) return;
    send(this.iframe, { kind: 'layout-context', seq: 0, layout });
  }

  kickoff(seq: number): void {
    if (!this.iframe) return;
    send(this.iframe, {
      kind: 'kickoff',
      seq,
      gameId: this.gameId,
    });

    // Start ack timer after kickoff is sent — waiting for game-started postMessage.
    this.kickoffAckTimer = setTimeout(() => {
      this.kickoffAckTimer = null;
      this.onLoadFailed?.('iframe-load-failed', 'Game did not send game-started within 10s');
    }, KICKOFF_ACK_TIMEOUT_MS);
  }

  private clearKickoffAckTimer(): void {
    if (this.kickoffAckTimer !== null) {
      clearTimeout(this.kickoffAckTimer);
      this.kickoffAckTimer = null;
    }
  }

  dispose(): void {
    this.clearKickoffAckTimer();
    if (this.manifestTimer !== null) {
      clearTimeout(this.manifestTimer);
      this.manifestTimer = null;
    }
    if (this.manifestResolver) {
      this.manifestResolver(null);
      this.manifestResolver = null;
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
