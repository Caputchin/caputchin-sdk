import type { WidgetWidth, WidgetHeight, WidgetSize, ConfigIssue, ConfigInspection } from './shared.js';
import { parseCommonAttrs, validateGameUrl } from './shared.js';
import type { LayoutAttr } from '../layout.js';
import { isLayoutAttr } from '../layout.js';

/** Game widget config. `sitekey === null` means "no verification" (game-only).
 *  With a sitekey the cap verification runs alongside the game iframe.
 *  Trigger is NOT an attribute on this widget — it is derived from layout
 *  by the element (`inline` → auto, `modal`/`fullscreen` → click). */
export interface GameConfig {
  sitekey: string | null;
  width: WidgetWidth;
  height: WidgetHeight;
  size: WidgetSize;
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
  const game = el.getAttribute('game');
  const games = el.getAttribute('games');
  let gameSrc = el.getAttribute('game-src');
  const rawLayout = el.getAttribute('layout');
  const rawTrigger = el.getAttribute('trigger');

  // parseCommonAttrs would re-parse trigger; on the game widget trigger is
  // implicit, so we only consume width/height/size and warn if a customer
  // tried to set trigger explicitly.
  const common = parseCommonAttrs(el, issues);
  if (rawTrigger !== null && rawTrigger !== '') {
    issues.push({ message: `trigger="${rawTrigger}" is ignored on <caputchin-game> — trigger is derived from layout (inline → auto, modal/fullscreen → click)` });
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
      width: common.width,
      height: common.height,
      size: common.size,
      game,
      games,
      gameSrc,
      layout,
    },
    issues,
    inert: false,
  };
}
