import type { ParsedConfig } from '../config.js';
import { fireError } from '../errors.js';
import type { IframeHost } from '../iframe/host.js';
import type { GamePresentation } from '../modes/game.js';

const MANIFEST_TIMEOUT_MS = 2000;
const DEFAULT_W = 400;
const DEFAULT_H = 300;

/**
 * Mount the iframe into the game presentation's slot, wait for manifest,
 * apply layout context + size, then kickoff. Game presentation is built
 * upfront in `connectedCallback` so the checkbox/frame is in the DOM before
 * any trigger fires.
 */
export async function installGameFrame(
  el: HTMLElement,
  gp: GamePresentation | null,
  config: ParsedConfig,
  host: IframeHost,
  onLoadFailed: (code: 'iframe-load-failed', message: string) => void,
  onGameStarted: () => void,
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

  host.mount(slot, onLoadFailed, onGameStarted);

  const iframe = host.getIframe();
  if (!iframe) {
    fireError(el, 'game-load-failed', 'IframeHost.build() returned no iframe', 'iframe-load-failed');
    return;
  }

  const layout = (config.layout && config.layout !== 'auto') ? config.layout : 'inline';
  const manifest = await host.waitManifest(MANIFEST_TIMEOUT_MS);
  applyIframeSize(host, config, manifest);
  host.setLayoutContext(layout);
  host.kickoff(1);
}

/**
 * Size the iframe by priority:
 *   1. Customer `width="<px>"` / `height="<px>"` attribute (numeric)
 *   2. Game's manifest `preferredWidth` / `preferredHeight`
 *   3. Widget default (400 × 300)
 * Width also supports `"full"` (spans parent → iframe = 100%) and
 * `"auto"` (defer to game preferred or default).
 */
export function applyIframeSize(
  host: IframeHost,
  config: ParsedConfig,
  manifest: { preferredWidth: number | null; preferredHeight: number | null } | null,
): void {
  let widthCss: number | '100%';
  if (typeof config.width === 'number') widthCss = config.width;
  else if (config.width === 'full') widthCss = '100%';
  else widthCss = manifest?.preferredWidth ?? DEFAULT_W;

  const heightCss = config.height ?? manifest?.preferredHeight ?? DEFAULT_H;
  host.setSize(widthCss, heightCss);
}
