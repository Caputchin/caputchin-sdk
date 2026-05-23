import { setupCapSession, awaitCapAndEmitPass } from './cap-session.js';
import { fireError, mapIframeErrorCode } from '../errors.js';
import { emitStart, emitPass } from './events.js';
import { IframeHost } from '../iframe/host.js';
import { collectSkinAssetOrigins } from '../bootstrap/asset-origins.js';
import { fetchMarketplaceResolution } from '../resolver.js';
import { resolveGameId } from './id.js';
import { installGameFrame } from './install-game-frame.js';
import { recordAdditionalRound } from './record-round.js';
import type { WidgetState } from './state.js';
import { shouldVerify } from '../config/game.js';
import type { GameConfig } from '../config/game.js';

/**
 * Orchestrator for `<caputchin-game>` iframe paths.
 *   - sitekey present → cap.solve + iframe in parallel; `pass` event carries
 *     wrapped token + game score.
 *   - sitekey absent → game-only; no cap; `pass` event carries `token: null`.
 *
 * For customer-hosted games (no iframe), see `run-manual.ts`.
 */
export async function runGame(el: HTMLElement, state: WidgetState<GameConfig>, apiHost: string): Promise<void> {
  if (!state.config) return;
  // Run the cap gate only when verification applies (sitekey + not no-verify).
  // The no-verify path still mounts + runs the game and resolves the bundle
  // (via the sitekey-backed bootstrap), it just skips the cap solve.
  if (shouldVerify(state.config)) {
    await runGameWithVerify(el, state, apiHost);
  } else {
    await runGameOnly(el, state, apiHost);
  }
}

/** Resolve the game URL (from cfg.gameSrc directly or via marketplace
 *  lookup), or fire game-load-failed + return null. Returns null when the
 *  widget has no game configured at all (caller decides whether that's a
 *  warning or hard error). */
export async function resolveGameUrl(
  el: HTMLElement,
  cfg: GameConfig,
  apiHost: string,
  onError: () => void,
  prefetched: WidgetState<GameConfig>['gameBundle'] = null,
): Promise<{ url: string | null; integrity: string | null; gameId: string | null }> {
  const gameId = resolveGameId(cfg);
  let url: string | null = cfg.gameSrc;
  let integrity: string | null = null;
  if (gameId && !url) {
    // Reuse the mount-time bootstrap's bundle when it was fetched for THIS
    // id (ADR-0059 single round trip). A `games` pool pick can differ from
    // the mount-time `game`, so the id guard sends that case to a fresh
    // resolve. `prefetched.url === null` means the bootstrap saw no
    // marketplace bundle for the id — the same outcome a fresh resolve
    // would report, so fail closed identically.
    const bundle = prefetched && prefetched.gameId === gameId ? prefetched : null;
    if (bundle) {
      if (!bundle.url) {
        fireError(el, 'game-load-failed', `Widget bootstrap returned no marketplace bundle for game "${gameId}"`, 'resolve-failed');
        onError();
        return { url: null, integrity: null, gameId };
      }
      url = bundle.url;
      integrity = bundle.integrity;
    } else {
      const resolution = await fetchMarketplaceResolution(gameId, apiHost, cfg.sitekey);
      if (!resolution.ok) {
        fireError(el, 'game-load-failed', resolution.message, resolution.code);
        onError();
        return { url: null, integrity: null, gameId };
      }
      url = resolution.url;
      integrity = resolution.integrity;
    }
  }
  return { url, integrity, gameId };
}

async function runGameWithVerify(el: HTMLElement, state: WidgetState<GameConfig>, apiHost: string): Promise<void> {
  const cfg = state.config!;
  state.gamePresentation?.setState('verifying');

  const resolved = await resolveGameUrl(el, cfg, apiHost, () => {
    state.gamePresentation?.setState('error');
  }, state.gameBundle ?? null);
  if (resolved.url === null && resolved.gameId !== null) return; // resolveGameUrl already fired the error

  const { url: gameUrl, integrity, gameId } = resolved;
  const { client, getWrappedToken } = setupCapSession(state, apiHost, cfg.sitekey!);
  const dispatchStart = (): void => emitStart(el, gameId);

  if (gameId === null && gameUrl === null) {
    console.warn('[caputchin] game widget mounted without game configured; verification will run but no iframe will mount');
    client.releaseGate({ score: null, durationMs: null });
    dispatchStart();
  } else {
    let firstClickHappened = false;
    const host = new IframeHost(gameUrl, integrity, gameId, el, (msg) => {
      if (msg.kind === 'game-pass') {
        if (!firstClickHappened) {
          firstClickHappened = true;
          client.releaseGate({ score: msg.score, durationMs: msg.durationMs });
        } else {
          void recordAdditionalRound(el, state, apiHost, { score: msg.score, durationMs: msg.durationMs });
        }
      } else if (msg.kind === 'game-error') {
        const { code, originalCode } = mapIframeErrorCode(msg.code);
        fireError(el, code, msg.message, originalCode);
        state.gameErrored = true;
        client.abortGate(new Error(`game-error: ${msg.code}`));
      }
    }, collectSkinAssetOrigins(state.gameOverrides ?? null));
    state.iframeHost = host;

    await installGameFrame(
      el,
      state.gamePresentation ?? null,
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
      state.gameOverrides ?? null,
    );
  }

  await awaitCapAndEmitPass(el, state, client, getWrappedToken, state.gamePresentation ?? null);
}

async function runGameOnly(el: HTMLElement, state: WidgetState<GameConfig>, apiHost: string): Promise<void> {
  const cfg = state.config!;
  const resolved = await resolveGameUrl(el, cfg, apiHost, () => { /* game-only has no presentation state to flip */ }, state.gameBundle ?? null);
  if (resolved.url === null && resolved.gameId !== null) return; // resolveGameUrl already fired the error

  const { url: gameUrl, integrity, gameId } = resolved;
  if (gameId === null && gameUrl === null) {
    console.warn('[caputchin] game widget mounted without sitekey + without game configured; widget is inert');
    return;
  }

  const dispatchStart = (): void => {
    if (state.gameStartedEmitted) return;
    state.gameStartedEmitted = true;
    emitStart(el, gameId);
  };

  const host = new IframeHost(gameUrl, integrity, gameId, el, (msg) => {
    if (msg.kind === 'game-pass') {
      state.gamePresentation?.setState('verified');
      emitPass(el, { token: null, score: msg.score, durationMs: msg.durationMs });
    } else if (msg.kind === 'game-error') {
      const { code, originalCode } = mapIframeErrorCode(msg.code);
      fireError(el, code, msg.message, originalCode);
      state.gamePresentation?.setState('error');
    }
  }, collectSkinAssetOrigins(state.gameOverrides ?? null));
  state.iframeHost = host;

  await installGameFrame(
    el,
    state.gamePresentation ?? null,
    cfg,
    host,
    (code, message) => {
      fireError(el, 'game-load-failed', message, code);
      state.gamePresentation?.setState('error');
      state.iframeHost = null;
    },
    dispatchStart,
    state.gameOverrides ?? null,
  );
}
