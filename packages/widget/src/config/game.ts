import type { WidgetWidth, WidgetHeight, ConfigIssue, ConfigInspection } from './shared.js';
import { parseCommonAttrs, validateGameUrl } from './shared.js';
import type { LayoutAttr } from '../layout.js';
import { isLayoutAttr } from '../layout.js';

/** Only manual is a customer-settable trigger on the game widget. All other
 *  triggers are layout-derived (inline → auto, modal/fullscreen → click).
 *  Manual is the escape hatch; no iframe; the customer hosts the game in
 *  their own DOM and slots it into the layout shell. */
export type GameTrigger = 'manual' | null;

/** Game widget config. Verification (the cap gate) runs when a sitekey is
 *  present AND `no-verify` is not set - see {@link shouldVerify}. The two
 *  concerns are orthogonal: the sitekey is the tenant key that unlocks the
 *  bootstrap fetch (overrides + marketplace bundle resolution), while
 *  `no-verify` opts out of the gate. So a game-only widget can still supply a
 *  sitekey to receive overrides - it just skips the cap solve. With no sitekey
 *  there is nothing to verify against, so `no-verify` is implied.
 *  When `trigger === 'manual'`, no iframe mounts; customer slots custom
 *  game DOM via the default `<slot>` inside the layout shell and drives
 *  completion via `pass()` / `fail()`. */
export interface GameConfig {
  sitekey: string | null;
  /** Boolean `no-verify` attribute: skip the cap gate but keep everything
   *  else (bootstrap overrides, marketplace resolve, the game itself).
   *  Implied true when there's no sitekey. */
  noVerify: boolean;
  trigger: GameTrigger;
  width: WidgetWidth;
  height: WidgetHeight;
  game: string | null;
  games: string | null;
  gameSrc: string | null;
  /** Default `auto`; defers to manifest/breakpoint. `inline | modal | fullscreen` are explicit. */
  layout: LayoutAttr;
  /** Raw `locale` attribute value (un-resolved). Sent to the server as this
   *  mount's language signal; the server resolves it against the game's
   *  manifest presets plus the scope's overrides and returns the resolved
   *  preset. Unlike the shell, the game also accepts an inline JSON object
   *  here, which the server parses and layers on top of the resolved presets.
   *  Null when omitted or empty. */
  locale: string | null;
  /** Raw `skin` attribute value (un-resolved). Sent to the server as this
   *  mount's skin signal and resolved there against the game's manifest skins
   *  plus the scope's overrides; like locale, the game also accepts an inline
   *  JSON object (the shell does not). Also drives the widget shell's skin (the
   *  shell consumes only `_theme`). Null when omitted or empty. */
  skin: string | null;
  // No `config` attribute: gameplay config is server-authoritative. A
  // client-authored config can't be reproduced at replay (a false-reject) and
  // is tamperable, so the game's config comes only from the server (the
  // bootstrap-resolved preset, minted into the gate ticket). locale + skin ARE
  // client attributes, but they are signals the server resolves and returns
  // (it sends back the resolved presets), not values the client renders raw.
}

/**
 * Graceful inspector for the game widget. Never throws. Game widget is never
 * `inert`: even with no game configured, the widget mounts but warns; even
 * with no sitekey, it runs game-only. A `trigger` attr if present is ignored
 * with a warning; trigger is implicit per layout on this widget.
 */
export function inspectGameConfig(el: HTMLElement): ConfigInspection<GameConfig> {
  const issues: ConfigIssue[] = [];
  const rawSitekey = el.getAttribute('sitekey');
  const sitekey = rawSitekey && rawSitekey.length > 0 ? rawSitekey : null;
  const noVerify = el.hasAttribute('no-verify');
  let game = el.getAttribute('game');
  let games = el.getAttribute('games');
  let gameSrc = el.getAttribute('game-src');
  const rawLayout = el.getAttribute('layout');
  const rawTrigger = el.getAttribute('trigger');
  const rawSize = el.getAttribute('size');

  // parseCommonAttrs returns trigger/width/height/size. On this widget the
  // only customer-settable trigger value is "manual"; everything else is
  // layout-derived. Size is always implicit per layout.
  const common = parseCommonAttrs(el, issues);
  let trigger: GameTrigger = null;
  if (rawTrigger !== null && rawTrigger !== '') {
    if (rawTrigger === 'manual') {
      trigger = 'manual';
    } else {
      issues.push({ message: `trigger="${rawTrigger}" is ignored on <caputchin-game>; only "manual" is settable; auto/click are derived from layout (inline → auto, modal/fullscreen → click)` });
    }
  }
  if (rawSize !== null && rawSize !== '') {
    issues.push({ message: `size="${rawSize}" is ignored on <caputchin-game>; size is derived from layout (inline → compact, modal/fullscreen → normal)` });
  }

  // Manual mode = customer slots custom game DOM; game/games/game-src can't
  // load (no iframe). Strip and warn.
  if (trigger === 'manual') {
    if (game !== null || games !== null || gameSrc !== null) {
      issues.push({ message: 'game / games / game-src are ignored when trigger="manual"; customer slots custom game DOM via <caputchin-game> children' });
      game = null;
      games = null;
      gameSrc = null;
    }
  }

  if (gameSrc !== null) {
    const urlErr = validateGameUrl(gameSrc);
    if (urlErr) {
      issues.push({ message: urlErr });
      gameSrc = null;
    }
  }

  let layout: LayoutAttr = 'auto';
  if (rawLayout !== null && rawLayout !== '') {
    if (!isLayoutAttr(rawLayout)) {
      issues.push({ message: `layout="${rawLayout}" is invalid; expected inline|modal|fullscreen|auto; falling back to "auto"` });
    } else {
      layout = rawLayout;
    }
  }

  const rawLocale = el.getAttribute('locale');
  const locale = rawLocale !== null && rawLocale.trim().length > 0 ? rawLocale : null;
  const rawSkin = el.getAttribute('skin');
  const skin = rawSkin !== null && rawSkin.trim().length > 0 ? rawSkin : null;

  return {
    config: {
      sitekey,
      noVerify,
      trigger,
      width: common.width,
      height: common.height,
      game,
      games,
      gameSrc,
      layout,
      locale,
      skin,
    },
    issues,
    inert: false,
  };
}

/** Whether the cap verification gate runs for this game mount. True only when
 *  a sitekey is present and `no-verify` is not set. No sitekey ⇒ nothing to
 *  verify against ⇒ false (game-only). This is orthogonal to the bootstrap
 *  fetch, which is gated on the sitekey alone - a `no-verify` widget WITH a
 *  sitekey still fetches overrides + resolves marketplace bundles. */
export function shouldVerify(cfg: GameConfig): boolean {
  return cfg.sitekey !== null && !cfg.noVerify;
}
