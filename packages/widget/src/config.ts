import type { LayoutAttr } from './layout/types.js';
import { isLayoutAttr } from './layout/types.js';

export type WidgetMode = 'invisible' | 'simple' | 'game' | 'game-only';
export type WidgetTrigger = 'auto' | 'click' | 'form-submit' | 'manual';
/** `auto` (default) sizes to content. `full` spans the parent. A positive
 * number is an explicit pixel value that overrides both (and any game
 * preferredWidth). */
export type WidgetWidth = 'auto' | 'full' | number;
/** Explicit pixel height. `null` means "auto" — defer to the game's
 * preferredHeight (if any) or the widget default. */
export type WidgetHeight = number | null;
export type WidgetSize = 'normal' | 'compact';

export interface ParsedConfig {
  sitekey: string;
  mode: WidgetMode;
  trigger: WidgetTrigger;
  width: WidgetWidth;
  height: WidgetHeight;
  size: WidgetSize;
  game: string | null;
  games: string | null;
  gameSrc: string | null;
  layout: LayoutAttr | null;
}

export interface ConfigIssue {
  message: string;
}

export interface ConfigInspection {
  config: ParsedConfig;
  issues: ConfigIssue[];
  /** True when the widget should not activate any mode (e.g. missing sitekey in a Cap mode). */
  inert: boolean;
}

const BLOCKED_SCHEMES = /^(javascript|data|vbscript):/i;
// Reject chars that could break out of a CSP directive (;,`) or HTML attr ("'<>) or be control chars.
const UNSAFE_CHARS = /["'`;,<>\s\x00-\x1f]/;

const MODES: ReadonlyArray<WidgetMode> = ['invisible', 'simple', 'game', 'game-only'];
const TRIGGERS: ReadonlyArray<WidgetTrigger> = ['auto', 'click', 'form-submit', 'manual'];
const WIDTH_ENUM: ReadonlyArray<'auto' | 'full'> = ['auto', 'full'];
const SIZES: ReadonlyArray<WidgetSize> = ['normal', 'compact'];

function parsePixelValue(raw: string): number | null {
  // Accept "500" or "500px"; reject negative, zero, NaN.
  const trimmed = raw.replace(/px$/i, '').trim();
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export function validateGameUrl(url: string): string | null {
  if (BLOCKED_SCHEMES.test(url)) {
    return `game-src blocked scheme: "${url}"`;
  }
  if (UNSAFE_CHARS.test(url)) {
    return `game-src contains unsafe characters: "${url}"`;
  }
  if (url.startsWith('/') && !url.startsWith('//')) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return `game-src is not a valid URL: "${url}"`;
  }
  if (parsed.protocol !== 'https:') {
    return `game-src must be HTTPS: "${url}"`;
  }
  return null;
}

export function canonicalizeGameUrl(url: string): string {
  if (url.startsWith('/') && !url.startsWith('//') && typeof location !== 'undefined') {
    return location.origin + url;
  }
  return url;
}

function isMode(v: string | null): v is WidgetMode {
  return v !== null && (MODES as ReadonlyArray<string>).includes(v);
}

function isTrigger(v: string | null): v is WidgetTrigger {
  return v !== null && (TRIGGERS as ReadonlyArray<string>).includes(v);
}

function isSize(v: string | null): v is WidgetSize {
  return v !== null && (SIZES as ReadonlyArray<string>).includes(v);
}

export function parseAttributes(el: HTMLElement): {
  sitekey: string;
  rawMode: string | null;
  rawTrigger: string | null;
  rawWidth: string | null;
  rawHeight: string | null;
  rawSize: string | null;
  game: string | null;
  games: string | null;
  gameSrc: string | null;
  rawLayout: string | null;
} {
  return {
    sitekey: el.getAttribute('sitekey') ?? '',
    rawMode: el.getAttribute('mode'),
    rawTrigger: el.getAttribute('trigger'),
    rawWidth: el.getAttribute('width'),
    rawHeight: el.getAttribute('height'),
    rawSize: el.getAttribute('size'),
    game: el.getAttribute('game'),
    games: el.getAttribute('games'),
    gameSrc: el.getAttribute('game-src'),
    rawLayout: el.getAttribute('layout'),
  };
}

/**
 * Graceful config inspection. Never throws. Returns a coerced config + the list
 * of issues for `error` events + an `inert` flag for when activation is impossible
 * (today: missing sitekey on a verification mode).
 */
export function inspectConfig(el: HTMLElement): ConfigInspection {
  const raw = parseAttributes(el);
  const issues: ConfigIssue[] = [];

  // ---- mode ----
  let mode: WidgetMode;
  if (raw.rawMode === null || raw.rawMode === '') {
    mode = 'simple';
  } else if (isMode(raw.rawMode)) {
    mode = raw.rawMode;
  } else {
    issues.push({ message: `mode="${raw.rawMode}" is invalid; falling back to "simple"` });
    mode = 'simple';
  }

  // ---- trigger (parsed first, validity-coerced below per mode) ----
  let trigger: WidgetTrigger;
  if (raw.rawTrigger === null || raw.rawTrigger === '') {
    trigger = 'auto';
  } else if (isTrigger(raw.rawTrigger)) {
    trigger = raw.rawTrigger;
  } else {
    issues.push({ message: `trigger="${raw.rawTrigger}" is invalid; falling back to "auto"` });
    trigger = 'auto';
  }

  // ---- width: auto | full | <pixels> ----
  let width: WidgetWidth;
  if (raw.rawWidth === null || raw.rawWidth === '') {
    width = 'auto';
  } else if ((WIDTH_ENUM as ReadonlyArray<string>).includes(raw.rawWidth)) {
    width = raw.rawWidth as 'auto' | 'full';
  } else {
    const px = parsePixelValue(raw.rawWidth);
    if (px === null) {
      issues.push({ message: `width="${raw.rawWidth}" is invalid; expected auto|full or a positive pixel value; falling back to "auto"` });
      width = 'auto';
    } else {
      width = px;
    }
  }

  // ---- height: pixels or null (defer to game preferred / widget default) ----
  let height: WidgetHeight = null;
  if (raw.rawHeight !== null && raw.rawHeight !== '') {
    const px = parsePixelValue(raw.rawHeight);
    if (px === null) {
      issues.push({ message: `height="${raw.rawHeight}" is invalid; expected a positive pixel value; ignoring` });
    } else {
      height = px;
    }
  }

  // ---- size ----
  let size: WidgetSize;
  if (raw.rawSize === null || raw.rawSize === '') {
    size = 'normal';
  } else if (isSize(raw.rawSize)) {
    size = raw.rawSize;
  } else {
    issues.push({ message: `size="${raw.rawSize}" is invalid; expected normal|compact; falling back to "normal"` });
    size = 'normal';
  }

  // ---- trigger × mode conflict coercion ----
  if (mode === 'game-only' && raw.rawTrigger !== null && raw.rawTrigger !== '') {
    issues.push({ message: `trigger="${raw.rawTrigger}" is ignored when mode="game-only" (game-only has no trigger axis)` });
    trigger = 'auto';
  }
  if (mode === 'invisible' && trigger === 'click') {
    issues.push({ message: `trigger="click" is incompatible with mode="invisible" (no UI to click); falling back to "auto"` });
    trigger = 'auto';
  }

  // ---- game attrs (only valid with mode=game or mode=game-only) ----
  let game = raw.game;
  let games = raw.games;
  let gameSrc = raw.gameSrc;
  if (mode !== 'game' && mode !== 'game-only') {
    if (game || games || gameSrc) {
      issues.push({ message: `game / games / game-src attributes are ignored when mode="${mode}"` });
    }
    game = null;
    games = null;
    gameSrc = null;
  }

  // ---- game-src URL validation ----
  if (gameSrc !== null) {
    const urlErr = validateGameUrl(gameSrc);
    if (urlErr) {
      issues.push({ message: urlErr });
      gameSrc = null;
    }
  }

  // ---- layout (only valid with mode=game or mode=game-only) ----
  let layout: LayoutAttr | null = null;
  if (raw.rawLayout !== null && raw.rawLayout !== '') {
    if (!isLayoutAttr(raw.rawLayout)) {
      issues.push({ message: `layout="${raw.rawLayout}" is invalid; expected inline|modal|fullscreen|auto` });
    } else if (mode !== 'game' && mode !== 'game-only') {
      issues.push({ message: `layout attribute is ignored when mode="${mode}"` });
    } else {
      layout = raw.rawLayout;
    }
  }

  // ---- sitekey ----
  let inert = false;
  const sitekey = raw.sitekey;
  if (mode === 'game-only') {
    if (sitekey) {
      issues.push({ message: 'sitekey is ignored when mode="game-only" (no verification runs)' });
    }
  } else if (!sitekey) {
    issues.push({ message: 'sitekey attribute is required for verification modes; widget will not activate' });
    inert = true;
  }

  return {
    config: { sitekey, mode, trigger, width, height, size, game, games, gameSrc, layout },
    issues,
    inert,
  };
}
