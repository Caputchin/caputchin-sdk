import type { WidgetTrigger, WidgetWidth, WidgetHeight, WidgetSize, ConfigIssue, ConfigInspection } from './shared.js';
import { parseCommonAttrs } from './shared.js';

/** Cap widget config. The widget has two visual forms:
 *  - default: checkbox + brand strip (visible).
 *  - `invisible` attribute set: no DOM at all; verification still runs per trigger.
 *
 *  There is no enum-style `mode` attribute; `invisible` is a boolean HTML
 *  attribute (same shape as `<input disabled>` / `<details open>`). */
export interface WidgetConfig {
  sitekey: string;
  invisible: boolean;
  trigger: WidgetTrigger;
  width: WidgetWidth;
  height: WidgetHeight;
  size: WidgetSize;
  /** Raw `lang` attribute value. Resolved against the widget's bundled
   *  shell presets at mount. Inline JSON is rejected (the widget shell
   *  only accepts preset names + ISO codes); omitted/empty means browser
   *  auto. */
  lang: string | null;
  /** Raw `skin` attribute value. Resolved against the widget's bundled
   *  skin presets at mount. Inline JSON is rejected; only `<mode>` /
   *  `auto` / `<skin-name>` are accepted. Omitted/empty means auto
   *  (honors `prefers-color-scheme`). */
  skin: string | null;
  /** Raw `config` attribute value. Resolved against the widget's bundled
   *  configurations presets at mount. Inline JSON is rejected; only
   *  `auto` / `<preset-name>` are accepted. */
  config: string | null;
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

  const rawLang = el.getAttribute('lang');
  const lang = rawLang !== null && rawLang.trim().length > 0 ? rawLang : null;
  const rawSkin = el.getAttribute('skin');
  const skin = rawSkin !== null && rawSkin.trim().length > 0 ? rawSkin : null;
  const rawConfig = el.getAttribute('config');
  const configAttr = rawConfig !== null && rawConfig.trim().length > 0 ? rawConfig : null;

  return {
    config: { sitekey, invisible, trigger, width: common.width, height: common.height, size: common.size, lang, skin, config: configAttr },
    issues,
    inert,
  };
}
