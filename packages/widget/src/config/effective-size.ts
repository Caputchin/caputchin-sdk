import type { WidgetWidth, WidgetHeight } from './shared.js';

type PreferredSize = { width?: number | 'full'; height?: number | 'full' } | null;

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
