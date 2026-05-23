import { buildSrcdoc } from './srcdoc.js';
import { listen, send } from '../protocol/channel.js';
import type { IframeToWidget, ManifestMessage } from '../protocol/messages.js';
import type { Layout, ResolvedConfig, ResolvedLocale, ResolvedSkin } from '@caputchin/game-sdk';

// srcdoc iframes always fire `load` for the wrapper document; even on CSP block or 404.
// The real readiness signal is `game-started` postMessage from the runtime.
const KICKOFF_ACK_TIMEOUT_MS = 10_000;

export class IframeHost {
  private readonly gameUrl: string | null;
  private readonly integrity: string | null;
  private readonly gameId: string | null;
  private readonly onMessage: (msg: IframeToWidget) => void;
  private readonly hostEl: HTMLElement;
  private readonly assetOrigins: string[];

  private iframe: HTMLIFrameElement | null = null;
  private unlisten: (() => void) | null = null;
  private kickoffAckTimer: ReturnType<typeof setTimeout> | null = null;
  private onLoadFailed: ((code: 'iframe-load-failed', message: string) => void) | null = null;

  private manifestResolver: ((m: ManifestMessage | null) => void) | null = null;
  private manifestTimer: ReturnType<typeof setTimeout> | null = null;
  private manifestSettled = false;
  private bufferedManifest: ManifestMessage | null = null;

  constructor(
    gameUrl: string | null,
    integrity: string | null,
    gameId: string | null,
    hostEl: HTMLElement,
    onMessage: (msg: IframeToWidget) => void,
    // Customer-configured skin asset origins (ADR-0059) allowed in the
    // frame's img-src / media-src. Defaults to none for game-only mounts
    // with no override bank.
    assetOrigins: string[] = []
  ) {
    this.gameUrl = gameUrl;
    this.integrity = integrity;
    this.gameId = gameId;
    this.hostEl = hostEl;
    this.onMessage = onMessage;
    this.assetOrigins = assetOrigins;
  }

  build(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.border = 'none';
    iframe.style.display = 'block';
    iframe.srcdoc = buildSrcdoc({
      gameId: this.gameId,
      gameUrl: this.gameUrl,
      integrity: this.integrity,
      runtimeJs: __IFRAME_RUNTIME__,
      runtimeSha256: __IFRAME_RUNTIME_SHA256__,
      assetOrigins: this.assetOrigins,
    });
    this.iframe = iframe;
    return iframe;
  }

  /**
   * Apply width/height to the iframe. Pass `null` for an axis to keep
   * whatever was previously set (or the default). Pixel numbers become
   * `${n}px`; the special string `'100%'` is passed through (used by
   * width="full" / height="full" in game presentation).
   */
  setSize(width: number | '100%' | null, height: number | '100%' | null): void {
    if (!this.iframe) return;
    if (width !== null) {
      this.iframe.style.width = typeof width === 'number' ? `${width}px` : width;
    }
    if (height !== null) {
      this.iframe.style.height = typeof height === 'number' ? `${height}px` : height;
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
      if (msg.kind === 'dimensions-measured') {
        // Apply directly to the iframe; outer shell (inline frame /
        // overlay dialog) re-flows automatically. Iframe-slot `data-fill`
        // path (customer-pinned inline) intentionally overrides via CSS
        // so customer attrs still win over auto-measure.
        this.setSize(msg.width, msg.height);
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

  /** Returns the game bundle URL (passed via `<caputchin-game game-src>`
   *  or derived from the `game` attribute's npm/CDN lookup). Used by the
   *  skin resolver as the base for bundle-relative asset paths in
   *  `skins.presets`. `null` for game-only-no-bundle cases. */
  getGameUrl(): string | null {
    return this.gameUrl;
  }

  /**
   * Wait for the iframe runtime to post its manifest. Resolves to the message
   * if received within `timeoutMs`, or `null` on timeout. Safe to call multiple
   * times; subsequent calls reuse the buffered manifest.
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

  /** Tell the iframe runtime the dialog visibility changed. The runtime
   *  suspends every AudioContext it has created when visible=false (and
   *  resumes them on visible=true) so the hidden dialog can't leak sound.
   *  Game logic keeps running regardless. */
  setVisibility(visible: boolean): void {
    if (!this.iframe) return;
    send(this.iframe, { kind: 'visibility', seq: 0, visible });
  }

  kickoff(
    seq: number,
    locale: ResolvedLocale | null = null,
    skin: ResolvedSkin | null = null,
    config: ResolvedConfig | null = null,
  ): void {
    if (!this.iframe) return;
    send(this.iframe, {
      kind: 'kickoff',
      seq,
      gameId: this.gameId,
      locale,
      skin,
      config,
    });

    // Start ack timer after kickoff is sent; waiting for game-started postMessage.
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
