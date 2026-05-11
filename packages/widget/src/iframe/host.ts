import { buildSrcdoc } from './srcdoc.js';
import { listen, send } from '../protocol/channel.js';
import type { IframeToWidget } from '../protocol/messages.js';

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
    onLoadFailed: (code: 'iframe-load-failed', message: string) => void,
    onGameStarted?: () => void
  ): void {
    if (!this.iframe) this.build();
    const iframe = this.iframe!;

    this.onLoadFailed = onLoadFailed;

    // Wrap the upstream onMessage to intercept game-started and clear the ack timer.
    this.unlisten = listen(iframe, this.hostEl, (msg) => {
      if (msg.kind === 'game-started') {
        this.clearKickoffAckTimer();
        onGameStarted?.();
      }
      this.onMessage(msg);
    });

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
