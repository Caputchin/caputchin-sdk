import type { WidgetWidth, WidgetHeight } from './shared.js';
import type { Layout } from '../layout.js';

type PreferredSize = { width?: number | 'full'; height?: number | 'full' } | null;

/** A resolved width/height pair for one surface. */
export interface SizePair {
  width: WidgetWidth;
  height: WidgetHeight;
}

/** The two independently-sized surfaces of a game mount. `entry` is the
 *  in-page element the customer places (the inline panel, or the overlay
 *  entry checkbox). `footprint` is the game surface (the inline iframe, or the
 *  overlay dialog + iframe). They are equal in inline layout (one box) and
 *  decoupled in modal/fullscreen. */
export interface GameSizing {
  entry: SizePair;
  footprint: SizePair;
}

/**
 * Resolve the width / height the OUTER shell presentation should use, folding in
 * the game's `preferred` block. A preferred `"full"` is promoted to the same
 * code path a customer `width="full"` takes, but ONLY when the customer left
 * that axis unset (width `'auto'`, height `null`) - an explicit customer value
 * always wins. Preferred PIXEL footprints are intentionally NOT surfaced here:
 * they keep being applied to the iframe by `applyIframeSize`, preserving the
 * existing shrink-wrap render path (host content-sized, iframe at the px). Only
 * `"full"` needs the shell because an iframe `100%` inside a content-sized host
 * collapses to zero width.
 */
export function resolvePresentationSize(
  config: { width: WidgetWidth; height: WidgetHeight },
  preferred: PreferredSize,
): { width: WidgetWidth; height: WidgetHeight } {
  const width: WidgetWidth =
    config.width === 'auto' && preferred?.width === 'full' ? 'full' : config.width;
  const height: WidgetHeight =
    config.height === null && preferred?.height === 'full' ? 'full' : config.height;
  return { width, height };
}

/**
 * Resolve the two surfaces of a game mount in one place, keyed off the already-
 * resolved layout, so nothing downstream re-derives layout or re-folds
 * `preferred`.
 *
 * - **inline**: one box. The panel IS the game, so `entry === footprint ===`
 *   the customer `width`/`height` folded with `preferred` (the existing rule).
 *   `overlay-*` are N/A and ignored.
 * - **modal / fullscreen**: two boxes. The `entry` (the in-page checkbox) is
 *   the customer's `width`/`height` taken RAW: it is not the game, so the
 *   game's `preferred` footprint must not promote it. The `footprint` (dialog +
 *   iframe) is `overlay-width`/`overlay-height` folded with `preferred` (same
 *   fold the inline panel uses), so leaving the overlay attrs unset preserves
 *   the prior behavior of deferring to the manifest footprint.
 */
export function resolveGameSizing(
  config: {
    width: WidgetWidth;
    height: WidgetHeight;
    overlayWidth: WidgetWidth;
    overlayHeight: WidgetHeight;
  },
  preferred: PreferredSize,
  layout: Layout,
): GameSizing {
  if (layout === 'inline') {
    const folded = resolvePresentationSize(config, preferred);
    return { entry: folded, footprint: folded };
  }
  return {
    entry: { width: config.width, height: config.height },
    footprint: resolvePresentationSize(
      { width: config.overlayWidth, height: config.overlayHeight },
      preferred,
    ),
  };
}
