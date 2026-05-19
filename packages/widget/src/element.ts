import { inspectConfig, type ParsedConfig } from './config.js';
import { fireError, mapIframeErrorCode } from './errors.js';
import { fetchMarketplaceResolution } from './resolver.js';
import { pickFromGamesAttr } from './pool.js';
import { injectHiddenInput } from './form.js';
import { IframeHost } from './iframe/host.js';
import { createCapClient, type CapClient } from './cap/client.js';
import { createPresentation, type Presentation } from './modes/index.js';
import { createTriggerStrategy, type TriggerStrategy, type TriggerContext } from './triggers/index.js';
import type { WrappedToken } from './token.js';
import { LayoutPresenter } from './layout/presenter.js';
import { resolveLayout } from './layout/resolve.js';
import { evalAutoBreakpoint } from './layout/breakpoint.js';

const MANIFEST_TIMEOUT_MS = 2000;
const DONE_DIALOG_CLOSE_MS = 600;

export class CaputchinElement extends HTMLElement {
  static observedAttributes = ['sitekey', 'mode', 'trigger', 'game', 'games', 'game-src', 'layout'];

  private presentation: Presentation | null = null;
  private trigger: TriggerStrategy | null = null;
  private triggerCtx: TriggerContext | null = null;
  private capClient: CapClient | null = null;
  private iframeHost: IframeHost | null = null;
  private layoutPresenter: LayoutPresenter | null = null;
  private connected = false;
  private config: ParsedConfig | null = null;
  private pendingKickoff: (() => void) | null = null;
  private doneCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private gameStartedEmitted = false;

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

    // game-only is a distinct path: iframe-only, no verification, no triggers.
    if (this.config.mode === 'game-only') {
      this.runGameOnly().catch(() => {});
      return;
    }

    // All other modes: presentation + trigger orchestrate verification.
    this.presentation = createPresentation(this.config.mode, { el: this });
    this.presentation?.mount();

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
    if (this.doneCloseTimer !== null) {
      clearTimeout(this.doneCloseTimer);
      this.doneCloseTimer = null;
    }
    this.trigger?.deactivate();
    this.trigger = null;
    this.triggerCtx = null;
    this.presentation?.unmount();
    this.presentation = null;
    this.capClient?.dispose();
    this.capClient = null;
    this.iframeHost?.dispose();
    this.iframeHost = null;
    this.layoutPresenter?.dispose();
    this.layoutPresenter = null;
    this.pendingKickoff = null;
    this.gameStartedEmitted = false;
    this.config = null;
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

    const client = createCapClient(this, apiHost, sessionCtx);
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
      const host = new IframeHost(gameUrl, integrity, gameId, this, (msg) => {
        if (msg.kind === 'game-pass') {
          sessionCtx.platform['score'] = msg.score;
          sessionCtx.platform['durationMs'] = msg.durationMs;
          this.onTriggerDone();
          client.releaseGate({ score: msg.score, durationMs: msg.durationMs });
        } else if (msg.kind === 'game-error') {
          const { code, originalCode } = mapIframeErrorCode(msg.code);
          fireError(this, code, msg.message, originalCode);
          this.onTriggerError();
          client.releaseGate({ score: null, durationMs: null });
        }
      });
      this.iframeHost = host;

      await this.installLayout(
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
      fireError(this, 'verification-failed', String(err), 'cap-solve-failed');
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
    this.dispatchEvent(new CustomEvent('pass', {
      detail: { token, score, durationMs },
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
        this.onTriggerDone();
        this.dispatchEvent(new CustomEvent('pass', {
          detail: { token: null, score: msg.score, durationMs: msg.durationMs },
          bubbles: true,
          composed: true,
        }));
      } else if (msg.kind === 'game-error') {
        const { code, originalCode } = mapIframeErrorCode(msg.code);
        fireError(this, code, msg.message, originalCode);
        this.onTriggerError();
      }
    });
    this.iframeHost = host;

    await this.installLayout(
      host,
      (code, message) => {
        fireError(this, 'game-load-failed', message, code);
        this.iframeHost = null;
      },
      dispatchStart,
    );
  }

  /**
   * Mount iframe into a presenter staging slot, wait for manifest, resolve
   * layout, re-parent iframe. Kickoff deferred to trigger checkbox activation
   * for modal/fullscreen; fires immediately for inline.
   */
  private async installLayout(
    host: IframeHost,
    onLoadFailed: (code: 'iframe-load-failed', message: string) => void,
    onGameStarted: () => void,
  ): Promise<void> {
    const presenter = new LayoutPresenter(this, {
      onTriggerActivate: () => {
        const fn = this.pendingKickoff;
        this.pendingKickoff = null;
        fn?.();
      },
      onDialogClose: () => {},
    });
    this.layoutPresenter = presenter;

    host.mount(presenter.getStaging(), onLoadFailed, onGameStarted);

    const iframe = host.getIframe();
    if (!iframe) {
      fireError(this, 'game-load-failed', 'IframeHost.build() returned no iframe', 'iframe-load-failed');
      return;
    }

    const manifest = await host.waitManifest(MANIFEST_TIMEOUT_MS);
    if (!manifest) {
      console.warn(`[caputchin] manifest-timeout — no manifest received from iframe within ${MANIFEST_TIMEOUT_MS}ms`);
    }

    const resolved = resolveLayout({
      attr: this.config?.layout ?? null,
      manifestPreferred: manifest?.preferredLayout ?? null,
      autoIsWide: evalAutoBreakpoint(),
    });

    presenter.apply(resolved.layout, iframe);

    this.dispatchEvent(new CustomEvent('layout-resolved', {
      detail: { layout: resolved.layout, source: resolved.source },
      bubbles: true,
      composed: true,
    }));

    const doKickoff = (): void => {
      host.setLayoutContext(resolved.layout);
      host.kickoff(1);
    };

    if (resolved.layout === 'inline') {
      doKickoff();
    } else {
      this.pendingKickoff = (): void => {
        presenter.setTriggerState('loading');
        presenter.open();
        doKickoff();
      };
    }
  }

  private onTriggerDone(): void {
    if (!this.layoutPresenter?.hasTrigger()) return;
    this.layoutPresenter.setTriggerState('done');
    if (this.doneCloseTimer !== null) clearTimeout(this.doneCloseTimer);
    this.doneCloseTimer = setTimeout(() => {
      this.doneCloseTimer = null;
      this.layoutPresenter?.close();
    }, DONE_DIALOG_CLOSE_MS);
  }

  private onTriggerError(): void {
    if (!this.layoutPresenter?.hasTrigger()) return;
    this.layoutPresenter.setTriggerState('error');
    this.layoutPresenter.close();
  }
}
