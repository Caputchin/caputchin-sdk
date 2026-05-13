import { parseAttributes, validateConfig } from './config.js';
import { fireError, mapIframeErrorCode } from './errors.js';
import { fetchMarketplaceResolution } from './resolver.js';

import { pickFromGamesAttr } from './pool.js';
import { injectHiddenInput } from './form.js';
import { IframeHost } from './iframe/host.js';
import { createCapClient, type CapClient } from './cap/client.js';
import { createModeStrategy, type ModeStrategy, type VerificationContext } from './modes/index.js';
import type { WrappedToken } from './token.js';

export class CaputchinElement extends HTMLElement {
  static observedAttributes = ['sitekey', 'game', 'games', 'game-src', 'mode'];

  private mode: ModeStrategy | null = null;
  private capClient: CapClient | null = null;
  private iframeHost: IframeHost | null = null;
  private connected = false;

  connectedCallback(): void {
    this.connected = true;

    const raw = parseAttributes(this);
    const invalid = validateConfig(raw);
    if (invalid) {
      fireError(this, invalid.code, invalid.message);
      return;
    }

    const apiHost = __CAPUTCHIN_API_HOST__;

    const ctx: VerificationContext = {
      sitekey: raw.sitekey,
      gameId: null,
      gameUrl: raw.gameSrc ?? null,
      integrity: null,
      apiHost,
      capClient: null,
    };

    // Resolve game ID from pool or direct game attr
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
    this.mode?.deactivate();
    this.mode = null;
    this.capClient?.dispose();
    this.capClient = null;
    this.iframeHost?.dispose();
    this.iframeHost = null;
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (this.connected && oldValue !== null) {
      console.warn(`[caputchin] attribute "${name}" changed mid-flight — ignored`);
    }
  }

  private async runVerification(ctx: VerificationContext): Promise<void> {
    const el = this as HTMLElement;
    const { apiHost, sitekey } = ctx;

    let gameUrl: string | null = ctx.gameUrl;
    let integrity: string | null = null;
    let gameId: string | null = ctx.gameId;

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
      onWrappedToken: (token: WrappedToken) => { wrappedToken = token; },
    };

    const client = createCapClient(el, apiHost, sessionCtx);
    this.capClient = client;
    ctx.capClient = client;

    const dispatchStart = (): void => {
      this.dispatchEvent(new CustomEvent('start', {
        detail: { gameId },
        bubbles: true,
        composed: true,
      }));
    };

    if (gameId !== null || gameUrl !== null) {
      const host = new IframeHost(gameUrl, integrity, gameId, el, (msg) => {
        if (msg.kind === 'game-pass') {
          sessionCtx.platform['score'] = msg.score;
          sessionCtx.platform['durationMs'] = msg.durationMs;
          client.releaseGate({ score: msg.score, durationMs: msg.durationMs });
        } else if (msg.kind === 'game-error') {
          const { code, originalCode } = mapIframeErrorCode(msg.code);
          fireError(el, code, msg.message, originalCode);
          client.releaseGate({ score: null, durationMs: null });
        }
      });

      host.mount(this, (code, message) => {
        client.releaseGate({ score: null, durationMs: null });
        fireError(el, code, message);
        client.dispose();
        this.iframeHost = null;
      }, dispatchStart);

      host.kickoff(1);
      this.iframeHost = host;
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

    this.dispatchEvent(new CustomEvent('pass', {
      detail: { token, score, durationMs },
      bubbles: true,
      composed: true,
    }));
  }

  private async runGameOnly(ctx: VerificationContext): Promise<void> {
    const el = this as HTMLElement;
    const { apiHost } = ctx;

    let gameUrl: string | null = ctx.gameUrl;
    let integrity: string | null = null;
    const gameId: string | null = ctx.gameId;

    if (gameId === null && gameUrl === null) {
      console.warn(
        '[caputchin] game-only mode with no game configured — widget is inert',
      );
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
      this.dispatchEvent(new CustomEvent('start', {
        detail: { gameId },
        bubbles: true,
        composed: true,
      }));
    };

    const host = new IframeHost(gameUrl, integrity, gameId, el, (msg) => {
      if (msg.kind === 'game-pass') {
        this.dispatchEvent(new CustomEvent('pass', {
          detail: { token: null, score: msg.score, durationMs: msg.durationMs },
          bubbles: true,
          composed: true,
        }));
      } else if (msg.kind === 'game-error') {
        const { code, originalCode } = mapIframeErrorCode(msg.code);
        fireError(el, code, msg.message, originalCode);
      }
    });

    host.mount(this, (code, message) => {
      fireError(el, code, message);
      this.iframeHost = null;
    }, dispatchStart);

    host.kickoff(1);
    this.iframeHost = host;
  }
}
