import { parseAttributes, validateConfig } from './config.js';
import { fireError, mapIframeErrorCode } from './errors.js';
import { fetchMarketplaceResolution } from './resolver.js';

import { pickFromGamesAttr } from './pool.js';
import { injectHiddenInput } from './form.js';
import { IframeHost } from './iframe/host.js';
import { createCapClient, type CapClient } from './cap/client.js';
import { createModeStrategy, type ModeStrategy, type VerificationContext } from './modes/index.js';
import type { WrappedToken } from './token.js';
import { LayoutPresenter } from './layout/presenter.js';
import { resolveLayout } from './layout/resolve.js';
import { evalAutoBreakpoint } from './layout/breakpoint.js';
import type { LayoutAttr } from './layout/types.js';

const MANIFEST_TIMEOUT_MS = 2000;
const DONE_DIALOG_CLOSE_MS = 600;

export class CaputchinElement extends HTMLElement {
  static observedAttributes = ['sitekey', 'game', 'games', 'game-src', 'mode', 'layout'];

  private mode: ModeStrategy | null = null;
  private capClient: CapClient | null = null;
  private iframeHost: IframeHost | null = null;
  private presenter: LayoutPresenter | null = null;
  private connected = false;
  private layoutAttr: LayoutAttr | null = null;
  private pendingKickoff: (() => void) | null = null;
  private doneCloseTimer: ReturnType<typeof setTimeout> | null = null;

  connectedCallback(): void {
    this.connected = true;

    const raw = parseAttributes(this);
    const invalid = validateConfig(raw);
    if (invalid) {
      fireError(this, invalid.code, invalid.message);
      return;
    }

    this.layoutAttr = raw.layout;

    const apiHost = __CAPUTCHIN_API_HOST__;

    const ctx: VerificationContext = {
      sitekey: raw.sitekey,
      gameId: null,
      gameUrl: raw.gameSrc ?? null,
      integrity: null,
      apiHost,
      capClient: null,
    };

    if (raw.games) {
      ctx.gameId = pickFromGamesAttr(raw.games);
    } else if (raw.game) {
      ctx.gameId = raw.game;
    }

    const runner =
      raw.mode === 'game-only'
        ? (): Promise<void> => this.runGameOnly(ctx)
        : (): Promise<void> => this.runVerification(ctx);
    this.mode = createModeStrategy(raw.mode, this, runner);
    this.mode.activate(ctx);
  }

  disconnectedCallback(): void {
    this.connected = false;
    if (this.doneCloseTimer !== null) {
      clearTimeout(this.doneCloseTimer);
      this.doneCloseTimer = null;
    }
    this.mode?.deactivate();
    this.mode = null;
    this.capClient?.dispose();
    this.capClient = null;
    this.iframeHost?.dispose();
    this.iframeHost = null;
    this.presenter?.dispose();
    this.presenter = null;
    this.pendingKickoff = null;
  }

  attributeChangedCallback(name: string, oldValue: string | null, _newValue: string | null): void {
    if (this.connected && oldValue !== null) {
      console.warn(`[caputchin] attribute "${name}" changed mid-flight — ignored`);
    }
  }

  /**
   * Mount the iframe into a presenter staging slot, wait for manifest, resolve
   * layout, re-parent iframe into the chosen wrapper, fire layout-resolved.
   * Kickoff fires immediately for inline; for modal/fullscreen, kickoff is
   * deferred to the trigger checkbox activation.
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
      onDialogClose: () => {
        // Nothing to do — trigger state already reflects done/error.
      },
    });
    this.presenter = presenter;

    host.mount(presenter.getStaging(), onLoadFailed, onGameStarted);

    const iframe = host.getIframe();
    if (!iframe) {
      fireError(this, 'iframe-load-failed', 'IframeHost.build() returned no iframe');
      return;
    }

    const manifest = await host.waitManifest(MANIFEST_TIMEOUT_MS);
    if (!manifest) {
      console.warn(
        `[caputchin] manifest-timeout — no manifest received from iframe within ${MANIFEST_TIMEOUT_MS}ms`,
      );
    }

    const resolved = resolveLayout({
      attr: this.layoutAttr,
      manifestPreferred: manifest?.preferredLayout ?? null,
      autoIsWide: evalAutoBreakpoint(),
    });

    presenter.apply(resolved.layout, iframe);

    this.dispatchEvent(
      new CustomEvent('layout-resolved', {
        detail: { layout: resolved.layout, source: resolved.source },
        bubbles: true,
        composed: true,
      }),
    );

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

  private onTriggerVerifying(): void {
    this.presenter?.setTriggerState('verifying');
  }

  private onTriggerDone(): void {
    if (!this.presenter?.hasTrigger()) return;
    this.presenter.setTriggerState('done');
    if (this.doneCloseTimer !== null) clearTimeout(this.doneCloseTimer);
    this.doneCloseTimer = setTimeout(() => {
      this.doneCloseTimer = null;
      this.presenter?.close();
    }, DONE_DIALOG_CLOSE_MS);
  }

  private onTriggerError(): void {
    if (!this.presenter?.hasTrigger()) return;
    this.presenter.setTriggerState('error');
    this.presenter.close();
  }

  private async runVerification(ctx: VerificationContext): Promise<void> {
    const el = this as HTMLElement;
    const { apiHost, sitekey } = ctx;

    let gameUrl: string | null = ctx.gameUrl;
    let integrity: string | null = null;
    const gameId: string | null = ctx.gameId;

    if (gameId && !gameUrl) {
      const resolution = await fetchMarketplaceResolution(gameId, apiHost);
      if (!resolution.ok) {
        fireError(el, resolution.code, resolution.message);
        return;
      }
      gameUrl = resolution.url;
      integrity = resolution.integrity;
    }

    let wrappedToken: WrappedToken | null = null;

    const sessionCtx = {
      platform: { sitekey, score: null, durationMs: null } as Record<string, unknown>,
      onWrappedToken: (token: WrappedToken) => {
        wrappedToken = token;
      },
    };

    const client = createCapClient(el, apiHost, sessionCtx);
    this.capClient = client;
    ctx.capClient = client;

    const dispatchStart = (): void => {
      this.dispatchEvent(
        new CustomEvent('start', {
          detail: { gameId },
          bubbles: true,
          composed: true,
        }),
      );
      this.onTriggerVerifying();
    };

    if (gameId !== null || gameUrl !== null) {
      const host = new IframeHost(gameUrl, integrity, gameId, el, (msg) => {
        if (msg.kind === 'game-pass') {
          sessionCtx.platform['score'] = msg.score;
          sessionCtx.platform['durationMs'] = msg.durationMs;
          this.onTriggerDone();
          client.releaseGate({ score: msg.score, durationMs: msg.durationMs });
        } else if (msg.kind === 'game-error') {
          const { code, originalCode } = mapIframeErrorCode(msg.code);
          fireError(el, code, msg.message, originalCode);
          this.onTriggerError();
          client.releaseGate({ score: null, durationMs: null });
        }
      });

      this.iframeHost = host;

      await this.installLayout(
        host,
        (code, message) => {
          client.releaseGate({ score: null, durationMs: null });
          fireError(el, code, message);
          client.dispose();
          this.iframeHost = null;
        },
        dispatchStart,
      );
    } else {
      client.releaseGate({ score: null, durationMs: null });
      dispatchStart();
    }

    try {
      await client.solve();
    } catch (err) {
      fireError(el, 'cap-solve-failed', String(err));
      return;
    }

    if (!wrappedToken) {
      fireError(el, 'cap-redeem-failed', 'No wrapped token received from platform');
      return;
    }

    const { token, score, durationMs } = wrappedToken;

    const form = el.closest('form');
    if (form instanceof HTMLFormElement) {
      injectHiddenInput(form, token);
    }

    this.dispatchEvent(
      new CustomEvent('pass', {
        detail: { token, score, durationMs },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private async runGameOnly(ctx: VerificationContext): Promise<void> {
    const el = this as HTMLElement;
    const { apiHost } = ctx;

    let gameUrl: string | null = ctx.gameUrl;
    let integrity: string | null = null;
    const gameId: string | null = ctx.gameId;

    if (gameId === null && gameUrl === null) {
      console.warn('[caputchin] game-only mode with no game configured — widget is inert');
      return;
    }

    if (gameId && !gameUrl) {
      const resolution = await fetchMarketplaceResolution(gameId, apiHost);
      if (!resolution.ok) {
        fireError(el, resolution.code, resolution.message);
        return;
      }
      gameUrl = resolution.url;
      integrity = resolution.integrity;
    }

    const dispatchStart = (): void => {
      this.dispatchEvent(
        new CustomEvent('start', {
          detail: { gameId },
          bubbles: true,
          composed: true,
        }),
      );
      this.onTriggerVerifying();
    };

    const host = new IframeHost(gameUrl, integrity, gameId, el, (msg) => {
      if (msg.kind === 'game-pass') {
        this.onTriggerDone();
        this.dispatchEvent(
          new CustomEvent('pass', {
            detail: { token: null, score: msg.score, durationMs: msg.durationMs },
            bubbles: true,
            composed: true,
          }),
        );
      } else if (msg.kind === 'game-error') {
        const { code, originalCode } = mapIframeErrorCode(msg.code);
        fireError(el, code, msg.message, originalCode);
        this.onTriggerError();
      }
    });

    this.iframeHost = host;

    await this.installLayout(
      host,
      (code, message) => {
        fireError(el, code, message);
        this.iframeHost = null;
      },
      dispatchStart,
    );
  }
}
