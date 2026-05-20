/** `auto` (default) sizes to content. `full` spans the parent. A positive
 * number is an explicit pixel value that overrides both (and any game
 * preferredWidth). */
export type WidgetWidth = 'auto' | 'full' | number;
/** Explicit pixel height. `null` means "auto" — defer to the game's
 * preferredHeight (if any) or the widget default. */
export type WidgetHeight = number | null;
export type WidgetSize = 'normal' | 'compact';
export type WidgetTrigger = 'auto' | 'click' | 'form-submit' | 'manual';

export interface ConfigIssue {
  message: string;
}

export interface ConfigInspection<C> {
  config: C;
  issues: ConfigIssue[];
  /** True when the widget should not activate (e.g. missing sitekey on the cap widget). */
  inert: boolean;
}

const BLOCKED_SCHEMES = /^(javascript|data|vbscript):/i;
// Reject chars that could break out of a CSP directive (;,`) or HTML attr ("'<>) or be control chars.
const UNSAFE_CHARS = /["'`;,<>\s\x00-\x1f]/;

const TRIGGERS: ReadonlyArray<WidgetTrigger> = ['auto', 'click', 'form-submit', 'manual'];
const WIDTH_ENUM: ReadonlyArray<'auto' | 'full'> = ['auto', 'full'];
const SIZES: ReadonlyArray<WidgetSize> = ['normal', 'compact'];

export function parsePixelValue(raw: string): number | null {
  // Accept "500" or "500px"; reject negative, zero, NaN.
  const trimmed = raw.replace(/px$/i, '').trim();
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export function validateGameUrl(url: string): string | null {
  if (BLOCKED_SCHEMES.test(url)) return `game-src blocked scheme: "${url}"`;
  if (UNSAFE_CHARS.test(url)) return `game-src contains unsafe characters: "${url}"`;
  if (url.startsWith('/') && !url.startsWith('//')) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return `game-src is not a valid URL: "${url}"`;
  }
  if (parsed.protocol !== 'https:') return `game-src must be HTTPS: "${url}"`;
  return null;
}

export function canonicalizeGameUrl(url: string): string {
  if (url.startsWith('/') && !url.startsWith('//') && typeof location !== 'undefined') {
    return location.origin + url;
  }
  return url;
}

export function isTrigger(v: string | null): v is WidgetTrigger {
  return v !== null && (TRIGGERS as ReadonlyArray<string>).includes(v);
}

export function isSize(v: string | null): v is WidgetSize {
  return v !== null && (SIZES as ReadonlyArray<string>).includes(v);
}

/**
 * Parse `trigger`, `width`, `height`, `size` attrs from the element. Used by
 * both widgets; mode/game/layout are widget-specific and parsed in their own
 * inspector.
 */
export function parseCommonAttrs(el: HTMLElement, issues: ConfigIssue[]): {
  trigger: WidgetTrigger;
  width: WidgetWidth;
  height: WidgetHeight;
  size: WidgetSize;
} {
  const rawTrigger = el.getAttribute('trigger');
  const rawWidth = el.getAttribute('width');
  const rawHeight = el.getAttribute('height');
  const rawSize = el.getAttribute('size');

  let trigger: WidgetTrigger;
  if (rawTrigger === null || rawTrigger === '') trigger = 'auto';
  else if (isTrigger(rawTrigger)) trigger = rawTrigger;
  else {
    issues.push({ message: `trigger="${rawTrigger}" is invalid; falling back to "auto"` });
    trigger = 'auto';
  }

  let width: WidgetWidth;
  if (rawWidth === null || rawWidth === '') width = 'auto';
  else if ((WIDTH_ENUM as ReadonlyArray<string>).includes(rawWidth)) width = rawWidth as 'auto' | 'full';
  else {
    const px = parsePixelValue(rawWidth);
    if (px === null) {
      issues.push({ message: `width="${rawWidth}" is invalid; expected auto|full or a positive pixel value; falling back to "auto"` });
      width = 'auto';
    } else width = px;
  }

  let height: WidgetHeight = null;
  if (rawHeight !== null && rawHeight !== '') {
    const px = parsePixelValue(rawHeight);
    if (px === null) issues.push({ message: `height="${rawHeight}" is invalid; expected a positive pixel value; ignoring` });
    else height = px;
  }

  let size: WidgetSize;
  if (rawSize === null || rawSize === '') size = 'normal';
  else if (isSize(rawSize)) size = rawSize;
  else {
    issues.push({ message: `size="${rawSize}" is invalid; expected normal|compact; falling back to "normal"` });
    size = 'normal';
  }

  return { trigger, width, height, size };
}
