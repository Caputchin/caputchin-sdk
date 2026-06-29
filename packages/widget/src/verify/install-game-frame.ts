import { fireError } from '../errors.js';
import type { IframeHost } from '../iframe/host.js';
import type { GamePresentation } from '../modes/game.js';
import type { SizePair } from '../config/effective-size.js';
import type { ResolvedAxes } from '../bootstrap/types.js';
import type { Layout, Seed } from '@caputchin/game-sdk';

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
  // The layout resolved at mount (embed attr, then preferred.layout, then inline),
  // passed in rather than re-derived here so `setLayoutContext` matches what
  // the presentation actually rendered (a `layout="auto"` mount that resolves
  // to modal via preferred.layout used to land here as 'inline').
  layout: Layout,
  // The resolved game-box footprint (already folded with preferred). Sizes the
  // iframe directly; the customer's `width`/`height` entry sizing lives in the
  // presentation, not here.
  footprint: SizePair,
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

  applyIframeSize(host, footprint, preferred);
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
 * Size the iframe from a pre-resolved footprint pair. Layout-agnostic: the
 * footprint already folded the game's `preferred` (in `resolveGameSizing`), so
 * the rules here are purely per-value:
 * - `'full'` → `100%` (stretch to fill the slot/dialog along that axis).
 * - a positive pixel number → that px (an explicit footprint, e.g.
 *   `overlay-width="500"`; a no-op for inline where the slot fill rule wins).
 * - `'auto'`/`null` → the manifest `preferred` pixel size, else the default.
 */
export function applyIframeSize(
  host: IframeHost,
  footprint: SizePair,
  preferred: { width?: number | 'full'; height?: number | 'full' } | null,
): void {
  const dim = (
    v: SizePair['width'] | SizePair['height'],
    pref: number | 'full' | undefined,
    dflt: number,
  ): number | '100%' =>
    v === 'full' ? '100%'
      : typeof v === 'number' ? v
      : typeof pref === 'number' ? pref
      : dflt;
  host.setSize(dim(footprint.width, preferred?.width, DEFAULT_W), dim(footprint.height, preferred?.height, DEFAULT_H));
}
