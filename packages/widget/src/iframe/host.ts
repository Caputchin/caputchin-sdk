import { buildSrcdoc } from './srcdoc.js';
import { listen, send } from '../protocol/channel.js';
import { buildWidgetShell } from '../locale/widget-shell.js';
import type { IframeToWidget } from '../protocol/messages.js';
import type { Layout, ResolvedConfig, ResolvedLocale, ResolvedSkin, Seed } from '@caputchin/game-sdk';

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
  // Resolves on the iframe document's `load` event (set up in build()). kickoff
  // waits on it so the runtime's message listener (and the game factory) exist
  // before the kickoff postMessage is sent. Otherwise a synchronous kickoff
  // (the no-verify / no-sitekey mount, which skips the bootstrap round trip that
  // would otherwise delay it) races ahead of the srcdoc parse and the message is
  // dropped. srcdoc iframes ALWAYS fire `load` (see top), so this never hangs.
  private frameLoaded: Promise<void> | null = null;

  constructor(
    gameUrl: string | null,
    integrity: string | null,
    gameId: string | null,
    hostEl: HTMLElement,
    onMessage: (msg: IframeToWidget) => void,
    // Customer-configured skin asset origins allowed in the frame's img-src /
    // media-src. Defaults to none for game-only mounts with no override bank.
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
    // Accessible name for the embedded challenge game (announced when a screen
    // reader enters the frame). English fallback at build; replaced with the
    // visitor's resolved-locale title at kickoff().
    iframe.title = buildWidgetShell(null).strings.frameTitle;
    // Capture the document `load` before setting srcdoc/appending so the event
    // can't be missed. kickoff() awaits this.
    this.frameLoaded = new Promise<void>((resolve) => {
      iframe.addEventListener('load', () => resolve(), { once: true });
    });
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
    seed: Seed | null = null,
    locale: ResolvedLocale | null = null,
    skin: ResolvedSkin | null = null,
    config: ResolvedConfig | null = null,
  ): void {
    if (!this.iframe) return;

    // Localize the iframe's accessible name now the visitor's locale is
    // resolved (the English fallback was set at build). A null locale (keyless
    // demo / bootstrap miss) keeps the English fallback.
    this.iframe.title = buildWidgetShell(locale).strings.frameTitle;

    const dispatch = (): void => {
      if (!this.iframe) return;
      send(this.iframe, {
        kind: 'kickoff',
        seq,
        gameId: this.gameId,
        seed,
        locale,
        skin,
        config,
      });

      // Start ack timer after kickoff is sent; waiting for game-started postMessage.
      this.kickoffAckTimer = setTimeout(() => {
        this.kickoffAckTimer = null;
        this.onLoadFailed?.('iframe-load-failed', 'Game did not send game-started within 10s');
      }, KICKOFF_ACK_TIMEOUT_MS);
    };

    // Wait for the iframe document `load` so the runtime listener + game factory
    // are present before kickoff (see frameLoaded). Falls through synchronously
    // if the frame somehow has no load promise (build() always sets one).
    if (this.frameLoaded) void this.frameLoaded.then(dispatch);
    else dispatch();
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
