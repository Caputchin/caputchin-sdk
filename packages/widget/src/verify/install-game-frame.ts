import type { GameConfig } from '../config/game.js';
import { fireError } from '../errors.js';
import type { IframeHost } from '../iframe/host.js';
import { resolveLocale } from '../locale/resolver.js';
import { resolveSkin } from '../skin/resolver.js';
import { resolveConfig } from '../configurations/resolver.js';
import type { GamePresentation } from '../modes/game.js';
import type { ManifestMessage } from '../protocol/messages.js';
import { injectOverrideLayer } from '../bootstrap/cascade-merge.js';
import type { OverridesPerAxis } from '../bootstrap/types.js';
import type { ConfigPreset, LocalePreset, Seed, SkinPreset } from '@caputchin/game-sdk';

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
  gameOverrides: OverridesPerAxis | null,
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
  const locale = resolveLocaleForGame(el, config, manifest, gameOverrides);
  const skin = resolveSkinForGame(el, config, manifest, host.getGameUrl(), gameOverrides);
  const cfg = resolveConfigForGame(el, config, manifest, gameOverrides);
  // Wait for the per-round seed before kickoff so the game's live run is
  // deterministic under it (ADR-0069). awaitSeed resolves null on a /verify/start
  // failure or a no-verify mount, so kickoff never deadlocks.
  const seed = awaitSeed ? await awaitSeed() : null;
  host.kickoff(1, seed, locale, skin, cfg);
}

/** Resolve the customer's `locale` attribute against the game's manifest
 *  presets, with any dashboard-authored override bank (from the bootstrap
 *  `game` block per ADR-0059) injected as a second layer on top — a
 *  name-collision override implicitly extends its bundled twin, same rule
 *  the widget shell uses. Issues fire as `invalid-config` events. Returns
 *  null when neither the manifest nor the overrides ship any preset, which
 *  the iframe runtime forwards as `ctx.locale = null`. */
export function resolveLocaleForGame(
  el: HTMLElement,
  config: GameConfig,
  manifest: ManifestMessage | null,
  gameOverrides: OverridesPerAxis | null,
): ReturnType<typeof resolveLocale>['resolved'] {
  const overrideBank = (gameOverrides?.locale?.presets ?? null) as Record<string, LocalePreset> | null;
  const presets = injectOverrideLayer(manifest?.locales?.presets, overrideBank);
  if (Object.keys(presets).length === 0) return null;
  const navLangs = (typeof navigator !== 'undefined' && navigator.languages)
    ? navigator.languages
    : (typeof navigator !== 'undefined' && navigator.language ? [navigator.language] : []);
  const { resolved, issues } = resolveLocale(presets, config.locale, navLangs);
  for (const message of issues) {
    fireError(el, 'invalid-config', message);
  }
  return resolved;
}

/** Resolve the customer's `config` attribute against the game's manifest
 *  configurations block. Returns null when the game ships no
 *  configurations presets, which the iframe runtime forwards as
 *  `ctx.config = null`. Mirrors `resolveSkinForGame` minus the bundle
 *  base URL (configurations carry typed scalars, not asset paths). */
export function resolveConfigForGame(
  el: HTMLElement,
  config: GameConfig,
  manifest: ManifestMessage | null,
  gameOverrides: OverridesPerAxis | null,
): ReturnType<typeof resolveConfig>['resolved'] {
  const block = manifest?.configurations;
  // Skin/config carry typed values validated against the schema, and the
  // schema is authoritative from the game manifest (override banks carry
  // values only, never schema). So a game that declares no configurations
  // block has nothing to validate overrides against — keep returning null.
  if (!block) return null;
  const overrideBank = (gameOverrides?.configuration?.presets ?? null) as Record<string, ConfigPreset> | null;
  const presets = injectOverrideLayer(block.presets, overrideBank);
  const { resolved, issues } = resolveConfig({
    presets,
    schema: block.schema ?? null,
    attrValue: config.config,
    rejectInlineJson: false,
  });
  for (const message of issues) {
    fireError(el, 'invalid-config', message);
  }
  return resolved;
}

/** Resolve the customer's `skin` attribute against the game's manifest
 *  skin block. Returns null when the game ships no skin presets, which
 *  the iframe runtime forwards as `ctx.skin = null` so games stay
 *  single-skin by default. Bundle-relative asset paths resolve against
 *  the game bundle URL (mirrors `game-src` resolution). */
export function resolveSkinForGame(
  el: HTMLElement,
  config: GameConfig,
  manifest: ManifestMessage | null,
  baseUrl: string | null,
  gameOverrides: OverridesPerAxis | null,
): ReturnType<typeof resolveSkin>['resolved'] {
  const skinBlock = manifest?.skins;
  // Schema is authoritative from the manifest (override banks carry no
  // schema); no manifest skin block ⇒ nothing to validate overrides
  // against, so the game stays single-skin.
  if (!skinBlock) return null;
  const overrideBank = (gameOverrides?.skin?.presets ?? null) as Record<string, SkinPreset> | null;
  const presets = injectOverrideLayer(skinBlock.presets, overrideBank);
  const prefersDark = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const { resolved, issues } = resolveSkin({
    presets,
    schema: skinBlock.schema ?? null,
    attrValue: config.skin,
    prefersDark,
    baseUrl,
    rejectInlineJson: false,
  });
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
