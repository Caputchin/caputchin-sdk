import { createCapClient } from '../cap/client.js';
import { fireError, mapIframeErrorCode } from '../errors.js';
import { injectHiddenInput } from '../form.js';
import { IframeHost } from '../iframe/host.js';
import { fetchMarketplaceResolution } from '../resolver.js';
import type { WrappedToken } from '../token.js';
import type { GameState } from './state-game.js';
import { makeWidgetId, resolveGameId } from './id.js';
import { installGameFrame } from './install-game-frame.js';
import { recordAdditionalRound } from './record-round.js';

/**
 * Orchestrator for `<caputchin-game>`. Two paths:
 *   - sitekey present → cap.solve + iframe in parallel; `pass` event carries
 *     wrapped token + game score.
 *   - sitekey absent → game-only; no cap; `pass` event carries `token: null`.
 *
 * The game iframe always mounts on this widget — there is no manual /
 * customer-hosted-game path here. Customers who want to host the game
 * themselves should use `<caputchin-widget>` (cap only) and drive the
 * game lifecycle independently.
 */
export async function runGame(el: HTMLElement, state: GameState, apiHost: string): Promise<void> {
  if (!state.config) return;
  if (state.config.sitekey) {
    await runGameWithVerify(el, state, apiHost);
  } else {
    await runGameOnly(el, state, apiHost);
  }
}

async function runGameWithVerify(el: HTMLElement, state: GameState, apiHost: string): Promise<void> {
  const cfg = state.config!;
  const gameId = resolveGameId(cfg);

  state.gamePresentation?.setState('verifying');

  let gameUrl: string | null = cfg.gameSrc;
  let integrity: string | null = null;

  if (gameId && !gameUrl) {
    const resolution = await fetchMarketplaceResolution(gameId, apiHost);
    if (!resolution.ok) {
      fireError(el, 'game-load-failed', resolution.message, resolution.code);
      state.gamePresentation?.setState('error');
      return;
    }
    gameUrl = resolution.url;
    integrity = resolution.integrity;
  }

  let wrappedToken: WrappedToken | null = null;
  const sessionCtx = {
    platform: { sitekey: cfg.sitekey!, score: null as unknown, durationMs: null as unknown } as Record<string, unknown>,
    onWrappedToken: (token: WrappedToken) => { wrappedToken = token; },
  };

  if (!state.widgetId) state.widgetId = makeWidgetId();
  const client = createCapClient(state.widgetId, apiHost, sessionCtx);
  state.capClient = client;
  if (state.triggerCtx) state.triggerCtx.capClient = client;

  const dispatchStart = (): void => {
    el.dispatchEvent(new CustomEvent('start', {
      detail: { gameId },
      bubbles: true,
      composed: true,
    }));
  };

  if (gameId === null && gameUrl === null) {
    console.warn('[caputchin] game widget mounted without game configured — verification will run but no iframe will mount');
    client.releaseGate({ score: null, durationMs: null });
    dispatchStart();
  } else {
    let firstClickHappened = false;
    const host = new IframeHost(gameUrl, integrity, gameId, el, (msg) => {
      if (msg.kind === 'game-pass') {
        sessionCtx.platform['score'] = msg.score;
        sessionCtx.platform['durationMs'] = msg.durationMs;
        if (!firstClickHappened) {
          firstClickHappened = true;
          client.releaseGate({ score: msg.score, durationMs: msg.durationMs });
        } else {
          void recordAdditionalRound(el, state.widgetId, state.lockedToken, apiHost, msg.score, msg.durationMs);
        }
      } else if (msg.kind === 'game-error') {
        const { code, originalCode } = mapIframeErrorCode(msg.code);
        fireError(el, code, msg.message, originalCode);
        state.gameErrored = true;
        client.abortGate(new Error(`game-error: ${msg.code}`));
      }
    });
    state.iframeHost = host;

    await installGameFrame(
      el,
      state.gamePresentation,
      cfg,
      host,
      (code, message) => {
        client.releaseGate({ score: null, durationMs: null });
        fireError(el, 'game-load-failed', message, code);
        state.gamePresentation?.setState('error');
        client.dispose();
        state.iframeHost = null;
      },
      () => {
        if (state.gameStartedEmitted) return;
        state.gameStartedEmitted = true;
        dispatchStart();
      },
    );
  }

  try {
    await client.solve();
  } catch (err) {
    if (!state.gameErrored) {
      fireError(el, 'verification-failed', String(err), 'cap-solve-failed');
    }
    state.gamePresentation?.setState('error');
    return;
  }

  if (state.gameErrored) {
    state.gamePresentation?.setState('error');
    return;
  }

  if (!wrappedToken) {
    fireError(el, 'verification-failed', 'No wrapped token received from platform', 'cap-redeem-failed');
    state.gamePresentation?.setState('error');
    return;
  }

  const { token, score, durationMs } = wrappedToken;

  const form = el.closest('form');
  if (form instanceof HTMLFormElement) {
    injectHiddenInput(form, token);
  }

  state.gamePresentation?.setState('verified');
  state.lockedToken = token;
  el.dispatchEvent(new CustomEvent('pass', {
    detail: { token, score, durationMs },
    bubbles: true,
    composed: true,
  }));
}

async function runGameOnly(el: HTMLElement, state: GameState, apiHost: string): Promise<void> {
  const cfg = state.config!;
  const gameId = resolveGameId(cfg);

  let gameUrl: string | null = cfg.gameSrc;
  let integrity: string | null = null;

  if (gameId === null && gameUrl === null) {
    console.warn('[caputchin] game widget mounted without sitekey + without game configured — widget is inert');
    return;
  }

  if (gameId && !gameUrl) {
    const resolution = await fetchMarketplaceResolution(gameId, apiHost);
    if (!resolution.ok) {
      fireError(el, 'game-load-failed', resolution.message, resolution.code);
      return;
    }
    gameUrl = resolution.url;
    integrity = resolution.integrity;
  }

  const dispatchStart = (): void => {
    if (state.gameStartedEmitted) return;
    state.gameStartedEmitted = true;
    el.dispatchEvent(new CustomEvent('start', {
      detail: { gameId },
      bubbles: true,
      composed: true,
    }));
  };

  const host = new IframeHost(gameUrl, integrity, gameId, el, (msg) => {
    if (msg.kind === 'game-pass') {
      state.gamePresentation?.setState('verified');
      el.dispatchEvent(new CustomEvent('pass', {
        detail: { token: null, score: msg.score, durationMs: msg.durationMs },
        bubbles: true,
        composed: true,
      }));
    } else if (msg.kind === 'game-error') {
      const { code, originalCode } = mapIframeErrorCode(msg.code);
      fireError(el, code, msg.message, originalCode);
      state.gamePresentation?.setState('error');
    }
  });
  state.iframeHost = host;

  await installGameFrame(
    el,
    state.gamePresentation,
    cfg,
    host,
    (code, message) => {
      fireError(el, 'game-load-failed', message, code);
      state.gamePresentation?.setState('error');
      state.iframeHost = null;
    },
    dispatchStart,
  );
}
