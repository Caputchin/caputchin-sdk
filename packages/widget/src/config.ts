export type WidgetMode = 'auto' | 'form-submit' | 'manual';

export interface ParsedConfig {
  sitekey: string;
  game: string | null;
  games: string | null;
  gameSrc: string | null;
  mode: WidgetMode;
}

export interface InvalidConfig {
  code: 'invalid-config';
  message: string;
}

const BLOCKED_SCHEMES = /^(javascript|data|vbscript):/i;
// Reject chars that could break out of a CSP directive (;,`) or HTML attr ("'<>) or be control chars.
const UNSAFE_CHARS = /["'`;,<>\s\x00-\x1f]/;

export function validateGameUrl(url: string): string | null {
  if (BLOCKED_SCHEMES.test(url)) {
    return `game-src blocked scheme: "${url}"`;
  }
  // Check raw input for unsafe chars before parsing — the URL constructor encodes/strips them.
  if (UNSAFE_CHARS.test(url)) {
    return `game-src contains unsafe characters: "${url}"`;
  }
  // Rebuild from parsed URL to prevent path-confusion and normalise encoding.
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

export function parseAttributes(el: HTMLElement): ParsedConfig {
  const sitekey = el.getAttribute('sitekey') ?? '';
  const game = el.getAttribute('game');
  const games = el.getAttribute('games');
  const gameSrc = el.getAttribute('game-src');
  const rawMode = el.getAttribute('mode');
  const mode: WidgetMode =
    rawMode === 'form-submit' || rawMode === 'manual' ? rawMode : 'auto';
  return { sitekey, game, games, gameSrc, mode };
}

export function validateConfig(cfg: ParsedConfig): InvalidConfig | null {
  if (!cfg.sitekey) {
    return { code: 'invalid-config', message: 'sitekey attribute is required' };
  }
  if (cfg.mode === 'manual' && (cfg.game || cfg.games || cfg.gameSrc)) {
    return {
      code: 'invalid-config',
      message: 'manual mode is incompatible with game / games / game-src attributes',
    };
  }
  if (cfg.gameSrc) {
    const err = validateGameUrl(cfg.gameSrc);
    if (err) {
      return { code: 'invalid-config', message: err };
    }
  }
  return null;
}
