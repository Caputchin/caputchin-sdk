import type { GameConfig } from '../config/game.js';
import { fireError } from '../errors.js';
import type { IframeHost } from '../iframe/host.js';
import { resolveLanguage } from '../lang/resolver.js';
import type { GamePresentation } from '../modes/game.js';
import type { ManifestMessage } from '../protocol/messages.js';

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
  config: GameConfig,
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
  const lang = resolveLangForGame(el, config, manifest);
  host.kickoff(1, lang);
}

/** Resolve the customer's `lang` attribute against the game's manifest
 *  presets. Issues fire as `invalid-config` events so the host page can
 *  log misconfigurations. Returns null when the game ships no presets,
 *  which the iframe runtime forwards as `ctx.lang = null`. */
function resolveLangForGame(
  el: HTMLElement,
  config: GameConfig,
  manifest: ManifestMessage | null,
): ReturnType<typeof resolveLanguage>['resolved'] {
  const presets = manifest?.languages?.presets;
  if (!presets) return null;
  const navLangs = (typeof navigator !== 'undefined' && navigator.languages)
    ? navigator.languages
    : (typeof navigator !== 'undefined' && navigator.language ? [navigator.language] : []);
  const { resolved, issues } = resolveLanguage(presets, config.lang, navLangs);
  for (const message of issues) {
    fireError(el, 'invalid-config', message);
  }
  return resolved;
}

/**
 * Size the iframe by the game's manifest (or defaults). The customer's
 * `width` / `height` attributes apply to the OUTER shell instead:
 *   - inline: customer dims set the bordered frame total size; iframe gets
 *     manifest-preferred dimensions and the brand strip fills the leftover.
 *   - modal/fullscreen: customer dims set the entry-checkbox size; iframe
 *     gets manifest-preferred dimensions and the dialog shrink-wraps to it.
 *
 * Exceptions: `width="full"` and `height="full"` stretch the iframe to
 * 100% along that axis. In inline mode the iframe fills the bordered
 * frame; in overlay (modal/fullscreen) mode the iframe fills the dialog
 * along the requested axis (paired with the `data-fill-x` / `data-fill-y`
 * CSS rules in modes/game.ts that opt the slot out of the centering
 * layout on that axis).
 */
export function applyIframeSize(
  host: IframeHost,
  config: GameConfig,
  manifest: { preferredWidth: number | null; preferredHeight: number | null } | null,
): void {
  const widthCss: number | '100%' = config.width === 'full'
    ? '100%'
    : (manifest?.preferredWidth ?? DEFAULT_W);
  const heightCss: number | '100%' = config.height === 'full'
    ? '100%'
    : (manifest?.preferredHeight ?? DEFAULT_H);
  host.setSize(widthCss, heightCss);
}
