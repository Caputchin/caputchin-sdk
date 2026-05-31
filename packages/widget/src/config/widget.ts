import type { WidgetTrigger, WidgetWidth, WidgetHeight, WidgetSize, ConfigIssue, ConfigInspection } from './shared.js';
import { parseCommonAttrs } from './shared.js';

/** Cap widget config. The widget has two visual forms:
 *  - default: checkbox + brand strip (visible).
 *  - `invisible` attribute set: no DOM at all; verification still runs per trigger.
 *
 *  There is no enum-style `mode` attribute; `invisible` is a boolean HTML
 *  attribute (same shape as `<input disabled>` / `<details open>`). */
export interface WidgetConfig {
  /** Your public site key. Required: without it the widget stays inert and
   *  emits a `warn`-severity `error` event. This is the public key, not your
   *  API secret. */
  sitekey: string;
  /** When present, the widget renders no visible UI; verification still runs
   *  per `trigger`. The default visible form is a checkbox with a brand strip. */
  invisible: boolean;
  /** When verification begins: `auto` on mount, `click` on the checkbox,
   *  `form-submit` when the enclosing form submits, or `manual` when you call
   *  `start()` yourself. */
  trigger: WidgetTrigger;
  /** Widget width: `auto` sizes to content, `full` spans the parent, or a
   *  positive pixel number fixes it. */
  width: WidgetWidth;
  /** Widget height: omitted/`null` is auto, `full` spans the parent, or a
   *  positive pixel number fixes it. */
  height: WidgetHeight;
  /** Visual density of the checkbox widget: `normal` (standard) or `compact`
   *  (smaller). */
  size: WidgetSize;
  /** Raw `locale` attribute value. Resolved against the widget's bundled
   *  shell presets at mount. On this shell widget the attribute is a
   *  selector only: preset names + ISO codes are accepted, inline JSON is
   *  rejected. This is a shell-specific choice (resolver flag
   *  `rejectInlineJson`), NOT a global widget rule; the game widget
   *  (`<caputchin-game>`) deliberately accepts inline-JSON locale so authors
   *  can hand-author a custom game locale on the attribute. The shell pushes
   *  custom authoring to CSS / server-served overrides instead. Omitted/empty
   *  means browser auto. */
  locale: string | null;
  /** Raw `skin` attribute value. Resolved against the widget's bundled
   *  skin presets at mount. Selector only on this shell widget: `<mode>` /
   *  `auto` / `<skin-name>` are accepted, inline JSON is rejected
   *  (`rejectInlineJson`). Same shell-specific scope as `locale` above: the
   *  game widget accepts inline-JSON skin, the shell does not, since the
   *  shell chrome is already CSS-styleable (`--cpt-skin-*` + `::part()`) and
   *  white-labelable. Omitted/empty means auto (honors
   *  `prefers-color-scheme`). */
  skin: string | null;
  // No `config` attribute: shell configuration (brand-strip links, etc.) is
  // server-authoritative - it comes from the bootstrap override bank, falling
  // back to the widget's bundled `default` preset. Client config authoring is
  // removed (parity with the game widget; see config/game.ts).
}

/**
 * Graceful inspector. Never throws. Returns a coerced WidgetConfig + the
 * list of issues for `error` events + an `inert` flag for when activation
 * is impossible (today: missing sitekey).
 */
export function inspectWidgetConfig(el: HTMLElement): ConfigInspection<WidgetConfig> {
  const issues: ConfigIssue[] = [];
  const sitekey = el.getAttribute('sitekey') ?? '';
  const invisible = el.hasAttribute('invisible');

  const common = parseCommonAttrs(el, issues);
  let trigger = common.trigger;

  // Invisible has no UI; trigger="click" makes no sense.
  if (invisible && trigger === 'click') {
    issues.push({ message: 'trigger="click" is incompatible with the invisible widget (no UI to click); falling back to "auto"' });
    trigger = 'auto';
  }

  let inert = false;
  if (!sitekey) {
    issues.push({ message: 'sitekey attribute is required; widget will not activate' });
    inert = true;
  }

  const rawLocale = el.getAttribute('locale');
  const locale = rawLocale !== null && rawLocale.trim().length > 0 ? rawLocale : null;
  const rawSkin = el.getAttribute('skin');
  const skin = rawSkin !== null && rawSkin.trim().length > 0 ? rawSkin : null;

  return {
    config: { sitekey, invisible, trigger, width: common.width, height: common.height, size: common.size, locale, skin },
    issues,
    inert,
  };
}
