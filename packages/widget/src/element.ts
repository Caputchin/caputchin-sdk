import { inspectConfig, type ParsedConfig } from './config.js';
import { fireError, mapIframeErrorCode } from './errors.js';
import { fetchMarketplaceResolution } from './resolver.js';
import { pickFromGamesAttr } from './pool.js';
import { injectHiddenInput } from './form.js';
import { IframeHost } from './iframe/host.js';
import { createCapClient, type CapClient } from './cap/client.js';
import { getSessionId } from './cap/custom-fetch.js';
import { createPresentation, type Presentation } from './modes/index.js';
import { createGamePresentation, type GamePresentation } from './modes/game.js';
import { createTriggerStrategy, type TriggerStrategy, type TriggerContext } from './triggers/index.js';
import type { WrappedToken } from './token.js';

const MANIFEST_TIMEOUT_MS = 2000;

let widgetIdCounter = 0;
function makeWidgetId(): string {
  // Unique per widget mount. Counter + Math.random keeps it stable inside one
  // page session without needing crypto APIs (which may not exist in older
  // WebView contexts on the support matrix).
  widgetIdCounter += 1;
  return `cpt_${widgetIdCounter}_${Math.random().toString(36).slice(2, 10)}`;
}

export class CaputchinElement extends HTMLElement {
  static observedAttributes = ['sitekey', 'mode', 'trigger', 'width', 'size', 'game', 'games', 'game-src', 'layout'];

  private presentation: Presentation | null = null;
  private trigger: TriggerStrategy | null = null;
  private triggerCtx: TriggerContext | null = null;
  private capClient: CapClient | null = null;
  private iframeHost: IframeHost | null = null;
  private connected = false;
  private config: ParsedConfig | null = null;
  private gameStartedEmitted = false;
  private widgetId: string | null = null;
  /** Set when the iframe game reported a fatal error; suppresses the duplicate
   * `verification-failed` event the catch handler would otherwise fire after
   * cap.solve rejects from the aborted gate. */
  private gameErrored = false;
  /** Locked at first successful pass; reused for multi-round follow-up pass events. */
  private lockedToken: string | null = null;
  /** Bordered-frame / modal / fullscreen presentation for game and game-only modes. */
  private gamePresentation: GamePresentation | null = null;

  connectedCallback(): void {
    this.connected = true;

    // Always-callable methods. Define before any potential early return so
    // `widget.start()` / `widget.pass()` / `widget.setNickname()` are present
    // even when the widget is inert (missing sitekey, etc.).
    this.installMethods();

    const inspection = inspectConfig(this);
    for (const issue of inspection.issues) {
      fireError(this, 'invalid-config', issue.message);
    }
    if (inspection.inert) return;

    this.config = inspection.config;

    // All modes: presentation + trigger orchestrate.
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });

    // Game / game-only modes: build the game presentation upfront so the
    // checkbox (modal/fullscreen) or the bordered frame (inline) is in the
    // DOM and ready to receive the trigger's onActivate wiring.
    if (this.config.mode === 'game' || this.config.mode === 'game-only') {
      const layout = (this.config.layout && this.config.layout !== 'auto')
        ? this.config.layout
        : 'inline';
      const gp = createGamePresentation({
        host: this,
        root: shadow,
        trigger: this.config.trigger,
        width: this.config.width,
        size: this.config.size,
        layout,
        mode: this.config.mode,
      });
      this.gamePresentation = gp;
      this.presentation = gp;
      gp.mount();
    } else {
      this.presentation = createPresentation(this.config.mode, {
      host: this,
        root: shadow,
        trigger: this.config.trigger,
        width: this.config.width,
        size: this.config.size,
      });
      this.presentation?.mount();
    }

    // game-only takes its own runGameOnly path (no cap, no trigger axis).
    if (this.config.mode === 'game-only') {
      this.runGameOnly().catch(() => {});
      return;
    }

    this.trigger = createTriggerStrategy(this.config.trigger);
    this.triggerCtx = {
      el: this,
      presentation: this.presentation ?? {
        mount(): void {},
        unmount(): void {},
        setState(): void {},
        onActivate(): () => void { return () => {}; },
      },
      runVerification: () => this.runVerification(),
      releaseManualPass: (payload) => {
        this.capClient?.releaseGate({ score: payload.score, durationMs: payload.durationMs });
      },
      capClient: null,
    };

    this.trigger.activate(this.triggerCtx);
  }

  disconnectedCallback(): void {
    this.connected = false;
    this.trigger?.deactivate();
    this.trigger = null;
    this.triggerCtx = null;
    this.presentation?.unmount();
    this.presentation = null;
    this.capClient?.dispose();
    this.capClient = null;
    this.iframeHost?.dispose();
    this.iframeHost = null;
    this.gameStartedEmitted = false;
    this.config = null;
    this.widgetId = null;
    this.gameErrored = false;
    this.lockedToken = null;
    this.gamePresentation?.unmount();
    this.gamePresentation = null;
  }

  attributeChangedCallback(name: string, oldValue: string | null, _newValue: string | null): void {
    if (this.connected && oldValue !== null) {
      console.warn(`[caputchin] attribute "${name}" changed mid-flight — ignored`);
    }
  }

  private installMethods(): void {
    Object.defineProperty(this, 'start', {
      value: (): void => {
        if (!this.config) return;
        if (this.config.mode === 'game-only') {
          fireError(this, 'invalid-call', 'start() not applicable in mode="game-only"');
          return;
        }
        this.trigger?.forceStart?.(this.triggerCtx!);
      },
      configurable: true,
      writable: false,
      enumerable: false,
    });

    Object.defineProperty(this, 'pass', {
      value: (payload?: { score?: number | null; durationMs?: number | null }): void => {
        if (!this.config) return;
        const inGameManual = this.config.mode === 'game' && this.config.trigger === 'manual';
        if (!inGameManual) {
          fireError(this, 'invalid-call', 'pass() only callable in mode="game" trigger="manual"');
          return;
        }
        const score = typeof payload?.score === 'number' ? payload.score : null;
        const durationMs = typeof payload?.durationMs === 'number' ? payload.durationMs : null;
        this.triggerCtx?.releaseManualPass({ score, durationMs });
      },
      configurable: true,
      writable: false,
      enumerable: false,
    });

    Object.defineProperty(this, 'setNickname', {
      value: (_letters: string): void => {
        throw new Error('setNickname is not implemented in this build (Post-MVP)');
      },
      configurable: true,
      writable: false,
      enumerable: false,
    });
  }

  private resolveGameId(): string | null {
    if (!this.config) return null;
    if (this.config.games) return pickFromGamesAttr(this.config.games);
    return this.config.game ?? null;
  }

  /**
   * Verification path for mode = invisible | simple | game.
   * Trigger has already decided "now" — this runs the verification + (if game
   * mode) mounts the iframe in parallel.
   */
  private async runVerification(): Promise<void> {
    if (!this.config) return;
    const cfg = this.config;
    const apiHost = __CAPUTCHIN_API_HOST__;
    const gameId = this.resolveGameId();

    this.presentation?.setState('verifying');

    let gameUrl: string | null = cfg.gameSrc;
    let integrity: string | null = null;

    const wantsIframe = cfg.mode === 'game' && cfg.trigger !== 'manual';

    if (wantsIframe && gameId && !gameUrl) {
      const resolution = await fetchMarketplaceResolution(gameId, apiHost);
      if (!resolution.ok) {
        fireError(this, 'game-load-failed', resolution.message, resolution.code);
        this.presentation?.setState('error');
        return;
      }
      gameUrl = resolution.url;
      integrity = resolution.integrity;
    }

    let wrappedToken: WrappedToken | null = null;
    const sessionCtx = {
      platform: { sitekey: cfg.sitekey, score: null as unknown, durationMs: null as unknown } as Record<string, unknown>,
      onWrappedToken: (token: WrappedToken) => { wrappedToken = token; },
    };

    // Per-widget id encoded into the Cap library's apiEndpoint path so the
    // custom-fetch router can attach session context without any shared
    // mutable state. 50 widgets solve in parallel; no queue, no race.
    if (!this.widgetId) this.widgetId = makeWidgetId();
    const client = createCapClient(this.widgetId, apiHost, sessionCtx);
    this.capClient = client;
    if (this.triggerCtx) this.triggerCtx.capClient = client;

    const dispatchStart = (): void => {
      this.dispatchEvent(new CustomEvent('start', {
        detail: { gameId },
        bubbles: true,
        composed: true,
      }));
    };

    if (wantsIframe && (gameId !== null || gameUrl !== null)) {
      let firstClickHappened = false;
      const host = new IframeHost(gameUrl, integrity, gameId, this, (msg) => {
        if (msg.kind === 'game-pass') {
          sessionCtx.platform['score'] = msg.score;
          sessionCtx.platform['durationMs'] = msg.durationMs;
          if (!firstClickHappened) {
            firstClickHappened = true;
            client.releaseGate({ score: msg.score, durationMs: msg.durationMs });
          } else {
            void this.recordAdditionalRound(apiHost, msg.score, msg.durationMs);
          }
        } else if (msg.kind === 'game-error') {
          const { code, originalCode } = mapIframeErrorCode(msg.code);
          fireError(this, code, msg.message, originalCode);
          this.gameErrored = true;
          client.abortGate(new Error(`game-error: ${msg.code}`));
        }
      });
      this.iframeHost = host;

      await this.installGameFrame(
        host,
        (code, message) => {
          client.releaseGate({ score: null, durationMs: null });
          fireError(this, 'game-load-failed', message, code);
          this.presentation?.setState('error');
          client.dispose();
          this.iframeHost = null;
        },
        () => {
          if (this.gameStartedEmitted) return;
          this.gameStartedEmitted = true;
          dispatchStart();
        },
      );
    } else {
      // No iframe in the verification path: invisible, simple, or game-manual.
      // For game-manual the Cap gate stays armed until widget.pass() releases.
      if (cfg.mode !== 'game') {
        // invisible / simple: no game payload to wait for — release immediately
        // so Cap's redeem can proceed end-to-end.
        client.releaseGate({ score: null, durationMs: null });
      }
      dispatchStart();
    }

    try {
      await client.solve();
    } catch (err) {
      // Game-error already fired a dedicated error event; don't double-report.
      if (!this.gameErrored) {
        fireError(this, 'verification-failed', String(err), 'cap-solve-failed');
      }
      this.presentation?.setState('error');
      return;
    }

    if (this.gameErrored) {
      // Game told us it failed — even if cap.solve somehow returned, the
      // verification is invalid. Drop the wrapped token, no pass event.
      this.presentation?.setState('error');
      return;
    }

    if (!wrappedToken) {
      fireError(this, 'verification-failed', 'No wrapped token received from platform', 'cap-redeem-failed');
      this.presentation?.setState('error');
      return;
    }

    const { token, score, durationMs } = wrappedToken;

    const form = this.closest('form');
    if (form instanceof HTMLFormElement) {
      injectHiddenInput(form, token);
    }

    this.presentation?.setState('verified');
    this.lockedToken = token;
    this.dispatchEvent(new CustomEvent('pass', {
      detail: { token, score, durationMs },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Multi-round path: cap.solve already minted the token. Subsequent
   * bridge.pass() calls from the iframe game record additional rounds —
   * fire /verify/pass directly with the existing sessionId + new payload,
   * then emit a follow-up `pass` event reusing the locked token.
   */
  private async recordAdditionalRound(
    apiHost: string,
    score: number | null,
    durationMs: number | null,
  ): Promise<void> {
    if (!this.widgetId || !this.lockedToken) return;
    const sessionId = getSessionId(this.widgetId);
    if (!sessionId) return;
    try {
      await window.fetch(`${apiHost}/api/v1/verify/pass`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platform: { sessionId, score, durationMs } }),
      });
    } catch {
      // best-effort scoreboard recording — fire the pass event regardless
    }
    this.dispatchEvent(new CustomEvent('pass', {
      detail: { token: this.lockedToken, score, durationMs },
      bubbles: true,
      composed: true,
    }));
  }

  private async runGameOnly(): Promise<void> {
    if (!this.config) return;
    const cfg = this.config;
    const apiHost = __CAPUTCHIN_API_HOST__;
    const gameId = this.resolveGameId();

    let gameUrl: string | null = cfg.gameSrc;
    let integrity: string | null = null;

    if (gameId === null && gameUrl === null) {
      console.warn('[caputchin] game-only mode with no game configured — widget is inert');
      return;
    }

    if (gameId && !gameUrl) {
      const resolution = await fetchMarketplaceResolution(gameId, apiHost);
      if (!resolution.ok) {
        fireError(this, 'game-load-failed', resolution.message, resolution.code);
        return;
      }
      gameUrl = resolution.url;
      integrity = resolution.integrity;
    }

    const dispatchStart = (): void => {
      if (this.gameStartedEmitted) return;
      this.gameStartedEmitted = true;
      this.dispatchEvent(new CustomEvent('start', {
        detail: { gameId },
        bubbles: true,
        composed: true,
      }));
    };

    const host = new IframeHost(gameUrl, integrity, gameId, this, (msg) => {
      if (msg.kind === 'game-pass') {
        // game-only: no verification, brand strip flips to "verified" on game-pass.
        this.presentation?.setState('verified');
        this.dispatchEvent(new CustomEvent('pass', {
          detail: { token: null, score: msg.score, durationMs: msg.durationMs },
          bubbles: true,
          composed: true,
        }));
      } else if (msg.kind === 'game-error') {
        const { code, originalCode } = mapIframeErrorCode(msg.code);
        fireError(this, code, msg.message, originalCode);
        this.presentation?.setState('error');
      }
    });
    this.iframeHost = host;

    await this.installGameFrame(
      host,
      (code, message) => {
        fireError(this, 'game-load-failed', message, code);
        this.presentation?.setState('error');
        this.iframeHost = null;
      },
      dispatchStart,
    );
  }

  /**
   * Build the game presentation (inline / modal / fullscreen) and mount the
   * iframe into its slot. For modal/fullscreen, the checkbox click opens the
   * dialog; iframe stays in DOM the whole time (no re-parent reloads srcdoc).
   */
  private async installGameFrame(
    host: IframeHost,
    onLoadFailed: (code: 'iframe-load-failed', message: string) => void,
    onGameStarted: () => void,
  ): Promise<void> {
    // Game presentation is built upfront in connectedCallback so the
    // checkbox/frame is in the DOM before any trigger fires. Just mount the
    // iframe into its slot here.
    const gp = this.gamePresentation;
    if (!gp) {
      fireError(this, 'game-load-failed', 'game presentation not built', 'iframe-load-failed');
      return;
    }
    const slot = gp.getIframeSlot();
    if (!slot) {
      fireError(this, 'game-load-failed', 'game-frame slot missing', 'iframe-load-failed');
      return;
    }

    host.mount(slot, onLoadFailed, onGameStarted);

    const iframe = host.getIframe();
    if (!iframe) {
      fireError(this, 'game-load-failed', 'IframeHost.build() returned no iframe', 'iframe-load-failed');
      return;
    }

    const layout = (this.config?.layout && this.config.layout !== 'auto')
      ? this.config.layout
      : 'inline';
    await host.waitManifest(MANIFEST_TIMEOUT_MS);
    host.setLayoutContext(layout);
    host.kickoff(1);
  }

  /**
   * Modal/fullscreen iframe mount path. Wait for manifest, resolve layout,
   * apply layout, kickoff. Kickoff deferred to trigger checkbox activation
   * for modal/fullscreen.
   */
}
