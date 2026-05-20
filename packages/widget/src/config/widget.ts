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

  return {
    config: { sitekey, invisible, trigger, width: common.width, height: common.height, size: common.size },
    issues,
    inert,
  };
}
