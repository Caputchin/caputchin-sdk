import { createCapClient } from '../cap/client.js';
import { fireError, mapIframeErrorCode } from '../errors.js';
import { injectHiddenInput } from '../form.js';
import { IframeHost } from '../iframe/host.js';
import { fetchMarketplaceResolution } from '../resolver.js';
import type { WrappedToken } from '../token.js';
import type { WidgetState } from './state.js';
import { makeWidgetId, resolveGameId } from './id.js';
import { installGameFrame } from './install-game-frame.js';
import { recordAdditionalRound } from './record-round.js';

/**
 * Verification path for `mode = invisible | simple | game`. Trigger has
 * already decided "now" — this runs the verification + (if game mode and
 * trigger ≠ manual) mounts the iframe in parallel.
 */
export async function runVerification(el: HTMLElement, state: WidgetState, apiHost: string): Promise<void> {
  if (!state.config) return;
  const cfg = state.config;
  const gameId = resolveGameId(cfg);

  state.presentation?.setState('verifying');

  let gameUrl: string | null = cfg.gameSrc;
  let integrity: string | null = null;

  const wantsIframe = cfg.mode === 'game' && cfg.trigger !== 'manual';

  if (wantsIframe && gameId && !gameUrl) {
    const resolution = await fetchMarketplaceResolution(gameId, apiHost);
    if (!resolution.ok) {
      fireError(el, 'game-load-failed', resolution.message, resolution.code);
      state.presentation?.setState('error');
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

  if (wantsIframe && (gameId !== null || gameUrl !== null)) {
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
        state.presentation?.setState('error');
        client.dispose();
        state.iframeHost = null;
      },
      () => {
        if (state.gameStartedEmitted) return;
        state.gameStartedEmitted = true;
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
    if (!state.gameErrored) {
      fireError(el, 'verification-failed', String(err), 'cap-solve-failed');
    }
    state.presentation?.setState('error');
    return;
  }

  if (state.gameErrored) {
    // Game told us it failed — even if cap.solve somehow returned, the
    // verification is invalid. Drop the wrapped token, no pass event.
    state.presentation?.setState('error');
    return;
  }

  if (!wrappedToken) {
    fireError(el, 'verification-failed', 'No wrapped token received from platform', 'cap-redeem-failed');
    state.presentation?.setState('error');
    return;
  }

  const { token, score, durationMs } = wrappedToken;

  const form = el.closest('form');
  if (form instanceof HTMLFormElement) {
    injectHiddenInput(form, token);
  }

  state.presentation?.setState('verified');
  state.lockedToken = token;
  el.dispatchEvent(new CustomEvent('pass', {
    detail: { token, score, durationMs },
    bubbles: true,
    composed: true,
  }));
}
