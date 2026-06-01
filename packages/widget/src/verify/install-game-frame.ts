import type { GameConfig } from '../config/game.js';
import { fireError } from '../errors.js';
import type { IframeHost } from '../iframe/host.js';
import type { GamePresentation } from '../modes/game.js';
import type { ResolvedAxes } from '../bootstrap/types.js';
import type { Seed } from '@caputchin/game-sdk';

const DEFAULT_W = 400;
const DEFAULT_H = 300;

/**
 * Mount the iframe into the game presentation's slot, apply layout context +
 * size, then kickoff. The SERVER resolved the game's presets + preferred
 * footprint (in the bootstrap response) and there is no game→widget manifest
 * handshake, so there is no `waitManifest` round trip - the resolved axes +
 * preferred dims are passed in and applied directly.
 */
export async function installGameFrame(
  el: HTMLElement,
  gp: GamePresentation | null,
  config: GameConfig,
  host: IframeHost,
  onLoadFailed: (code: 'iframe-load-failed', message: string) => void,
  onGameStarted: () => void,
  // Server-resolved game axes (locale / skin / config) from bootstrap.game.resolved.
  resolved: ResolvedAxes | null,
  // The game's preferred footprint from bootstrap.game.preferred (was the
  // manifest message's preferredWidth/Height). Each axis is a pixel count or the
  // literal 'full' (stretch to fill the parent).
  preferred: { width?: number | 'full'; height?: number | 'full' } | null,
  // Resolves with the per-round seed (from /verify/start, fired by the cap solve
  // the caller starts in parallel). Absent → no-verify mount, seed stays null.
  awaitSeed?: () => Promise<Seed | null>,
): Promise<void> {
  if (!gp) {
    fireError(el, 'game-load-failed', 'game presentation not built', 'iframe-load-failed');
    return;
  }
  const slot = gp.getIframeSlot();
  if (!slot) {
    fireError(el, 'game-load-failed', 'game-frame slot missing', 'iframe-load-failed');
    return;
  }

  try {
    // build() (via mount) throws synchronously on an invalid game URL
    // (e.g. a non-HTTPS, non-loopback src) or a bad srcdoc interpolation.
    // Surface it as game-load-failed instead of letting it bubble into the
    // trigger's fire-and-forget catch and vanish.
    host.mount(slot, onLoadFailed, onGameStarted);
  } catch (err) {
    onLoadFailed('iframe-load-failed', err instanceof Error ? err.message : String(err));
    return;
  }

  const iframe = host.getIframe();
  if (!iframe) {
    fireError(el, 'game-load-failed', 'IframeHost.build() returned no iframe', 'iframe-load-failed');
    return;
  }

  const layout = (config.layout && config.layout !== 'auto') ? config.layout : 'inline';
  applyIframeSize(host, config, preferred);
  host.setLayoutContext(layout);
  // Wait for the per-round seed before kickoff so the game's live run is
  // deterministic under it. awaitSeed resolves null on a /verify/start failure
  // or a no-verify mount, so kickoff never deadlocks. The resolved config is the
  // SAME value the server minted into the gate ticket, so the live run and the
  // server replay run on identical config (no false-reject).
  const seed = awaitSeed ? await awaitSeed() : null;
  host.kickoff(1, seed, resolved?.locale ?? null, resolved?.skin ?? null, resolved?.config ?? null);
}

/**
 * Size the iframe by the game's preferred footprint (or defaults). The
 * customer's `width` / `height` attributes apply to the OUTER shell instead;
 * `width="full"` / `height="full"` stretch the iframe to 100% along that axis.
 * A preferred `"full"` does the same, but only when the customer left that axis
 * unset (width `'auto'`, height `null`) - an explicit customer value wins.
 */
export function applyIframeSize(
  host: IframeHost,
  config: GameConfig,
  preferred: { width?: number | 'full'; height?: number | 'full' } | null,
): void {
  const fullW = config.width === 'full' || (config.width === 'auto' && preferred?.width === 'full');
  const fullH = config.height === 'full' || (config.height === null && preferred?.height === 'full');
  const widthCss: number | '100%' = fullW ? '100%' : (typeof preferred?.width === 'number' ? preferred.width : DEFAULT_W);
  const heightCss: number | '100%' = fullH ? '100%' : (typeof preferred?.height === 'number' ? preferred.height : DEFAULT_H);
  host.setSize(widthCss, heightCss);
}
