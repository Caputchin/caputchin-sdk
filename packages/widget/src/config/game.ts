import type { WidgetWidth, WidgetHeight, ConfigIssue, ConfigInspection } from './shared.js';
import { parseCommonAttrs, validateGameUrl } from './shared.js';
import type { LayoutAttr } from '../layout.js';
import { isLayoutAttr } from '../layout.js';

/** Only manual is a customer-settable trigger on the game widget. All other
 *  triggers are layout-derived (inline → auto, modal/fullscreen → click).
 *  Manual is the escape hatch — no iframe; the customer hosts the game in
 *  their own DOM and slots it into the layout chrome. */
export type GameTrigger = 'manual' | null;

/** Game widget config. `sitekey === null` means "no verification" (game-only).
 *  With a sitekey the cap verification runs alongside the game.
 *  When `trigger === 'manual'`, no iframe mounts — customer slots custom
 *  game DOM via the default `<slot>` inside the layout chrome and drives
 *  completion via `pass()` / `fail()`. */
export interface GameConfig {
  sitekey: string | null;
  trigger: GameTrigger;
  width: WidgetWidth;
  height: WidgetHeight;
  game: string | null;
  games: string | null;
  gameSrc: string | null;
  /** Default `auto` — defers to manifest/breakpoint. `inline | modal | fullscreen` are explicit. */
  layout: LayoutAttr;
}

/**
 * Graceful inspector for the game widget. Never throws. Game widget is never
 * `inert`: even with no game configured, the widget mounts but warns; even
 * with no sitekey, it runs game-only. A `trigger` attr if present is ignored
 * with a warning — trigger is implicit per layout on this widget.
 */
export function inspectGameConfig(el: HTMLElement): ConfigInspection<GameConfig> {
  const issues: ConfigIssue[] = [];
  const rawSitekey = el.getAttribute('sitekey');
  const sitekey = rawSitekey && rawSitekey.length > 0 ? rawSitekey : null;
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
      issues.push({ message: `trigger="${rawTrigger}" is ignored on <caputchin-game> — only "manual" is settable; auto/click are derived from layout (inline → auto, modal/fullscreen → click)` });
    }
  }
  if (rawSize !== null && rawSize !== '') {
    issues.push({ message: `size="${rawSize}" is ignored on <caputchin-game> — size is derived from layout (inline → compact, modal/fullscreen → normal)` });
  }

  // Manual mode = customer slots custom game DOM; game/games/game-src can't
  // load (no iframe). Strip and warn.
  if (trigger === 'manual') {
    if (game !== null || games !== null || gameSrc !== null) {
      issues.push({ message: 'game / games / game-src are ignored when trigger="manual" — customer slots custom game DOM via <caputchin-game> children' });
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

  return {
    config: {
      sitekey,
      trigger,
      width: common.width,
      height: common.height,
      game,
      games,
      gameSrc,
      layout,
    },
    issues,
    inert: false,
  };
}
