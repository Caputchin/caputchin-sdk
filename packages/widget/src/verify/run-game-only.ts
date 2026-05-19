import { fireError, mapIframeErrorCode } from '../errors.js';
import { IframeHost } from '../iframe/host.js';
import { fetchMarketplaceResolution } from '../resolver.js';
import type { WidgetState } from './state.js';
import { resolveGameId } from './id.js';
import { installGameFrame } from './install-game-frame.js';

/**
 * `mode="game-only"` path: no verification, no Cap, no trigger axis. Mount
 * the iframe, wait for `game-pass` to flip the brand strip + emit `pass`
 * with `token: null` (no wrapped token in this mode).
 */
export async function runGameOnly(el: HTMLElement, state: WidgetState, apiHost: string): Promise<void> {
  if (!state.config) return;
  const cfg = state.config;
  const gameId = resolveGameId(cfg);

  let gameUrl: string | null = cfg.gameSrc;
  let integrity: string | null = null;

  if (gameId === null && gameUrl === null) {
    console.warn('[caputchin] game-only mode with no game configured — widget is inert');
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
      state.presentation?.setState('verified');
      el.dispatchEvent(new CustomEvent('pass', {
        detail: { token: null, score: msg.score, durationMs: msg.durationMs },
        bubbles: true,
        composed: true,
      }));
    } else if (msg.kind === 'game-error') {
      const { code, originalCode } = mapIframeErrorCode(msg.code);
      fireError(el, code, msg.message, originalCode);
      state.presentation?.setState('error');
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
      state.presentation?.setState('error');
      state.iframeHost = null;
    },
    dispatchStart,
  );
}
