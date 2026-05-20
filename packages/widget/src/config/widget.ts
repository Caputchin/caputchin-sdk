import type { WidgetTrigger, WidgetWidth, WidgetHeight, WidgetSize, ConfigIssue, ConfigInspection } from './shared.js';
import { parseCommonAttrs } from './shared.js';

/** The cap widget runs PoW + instrumentation. Two presentation modes:
 *  - `invisible`: no UI, verification fires per trigger.
 *  - `simple`: classic captcha checkbox + brand. */
export type WidgetMode = 'invisible' | 'simple';

export interface WidgetConfig {
  sitekey: string;
  mode: WidgetMode;
  trigger: WidgetTrigger;
  width: WidgetWidth;
  height: WidgetHeight;
  size: WidgetSize;
}

const MODES: ReadonlyArray<WidgetMode> = ['invisible', 'simple'];

function isWidgetMode(v: string | null): v is WidgetMode {
  return v !== null && (MODES as ReadonlyArray<string>).includes(v);
}

/**
 * Graceful inspector. Never throws. Returns a coerced WidgetConfig + the
 * list of issues for `error` events + an `inert` flag for when activation
 * is impossible (today: missing sitekey).
 */
export function inspectWidgetConfig(el: HTMLElement): ConfigInspection<WidgetConfig> {
  const issues: ConfigIssue[] = [];
  const rawMode = el.getAttribute('mode');
  const sitekey = el.getAttribute('sitekey') ?? '';

  let mode: WidgetMode;
  if (rawMode === null || rawMode === '') mode = 'simple';
  else if (isWidgetMode(rawMode)) mode = rawMode;
  else {
    issues.push({ message: `mode="${rawMode}" is invalid; expected invisible|simple; falling back to "simple"` });
    mode = 'simple';
  }

  const common = parseCommonAttrs(el, issues);
  let trigger = common.trigger;

  // mode=invisible has no UI — trigger=click makes no sense.
  if (mode === 'invisible' && trigger === 'click') {
    issues.push({ message: `trigger="click" is incompatible with mode="invisible" (no UI to click); falling back to "auto"` });
    trigger = 'auto';
  }

  let inert = false;
  if (!sitekey) {
    issues.push({ message: 'sitekey attribute is required; widget will not activate' });
    inert = true;
  }

  return {
    config: { sitekey, mode, trigger, width: common.width, height: common.height, size: common.size },
    issues,
    inert,
  };
}
