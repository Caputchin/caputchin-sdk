import { describe, it, expect } from 'vitest';
import { parseAttributes, validateConfig, validateGameUrl } from '../../src/config.js';

function makeEl(attrs: Record<string, string>): HTMLElement {
  const el = document.createElement('div');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

describe('validateGameUrl', () => {
  it('accepts https URL', () => expect(validateGameUrl('https://example.com/game.js')).toBeNull());
  it('rejects http', () => expect(validateGameUrl('http://example.com/game.js')).not.toBeNull());
  it('rejects ftp', () => expect(validateGameUrl('ftp://example.com/game.js')).not.toBeNull());
  it('rejects javascript:', () => expect(validateGameUrl('javascript:alert(1)')).not.toBeNull());
  it('rejects data:', () => expect(validateGameUrl('data:text/html,<h1>x</h1>')).not.toBeNull());
  it('rejects vbscript:', () => expect(validateGameUrl('vbscript:msgbox()')).not.toBeNull());
  it('rejects URL with double-quote', () => expect(validateGameUrl('https://example.com/game".js')).not.toBeNull());
  it('rejects URL with whitespace', () => expect(validateGameUrl('https://example.com/game .js')).not.toBeNull());
  it('rejects URL with control char', () => expect(validateGameUrl('https://example.com/game\x00.js')).not.toBeNull());
  it('rejects URL with semicolon (CSP directive injection)', () => expect(validateGameUrl('https://evil.com/x;script-src https://atk.com')).not.toBeNull());
  it('rejects URL with comma (CSP source list injection)', () => expect(validateGameUrl('https://evil.com/x,https://atk.com')).not.toBeNull());
  it('rejects URL with backtick', () => expect(validateGameUrl('https://evil.com/x`y')).not.toBeNull());
});

describe('validateConfig', () => {
  it('missing sitekey → invalid-config', () => {
    const cfg = { sitekey: '', game: null, games: null, gameSrc: null, mode: 'auto' as const };
    expect(validateConfig(cfg)?.code).toBe('invalid-config');
  });

  it('manual + game → invalid-config', () => {
    const cfg = { sitekey: 'k', game: '@org/g', games: null, gameSrc: null, mode: 'manual' as const };
    expect(validateConfig(cfg)?.code).toBe('invalid-config');
  });

  it('manual + game-src → invalid-config', () => {
    const cfg = { sitekey: 'k', game: null, games: null, gameSrc: 'https://example.com/g.js', mode: 'manual' as const };
    expect(validateConfig(cfg)?.code).toBe('invalid-config');
  });

  it('invalid game-src → invalid-config', () => {
    const cfg = { sitekey: 'k', game: null, games: null, gameSrc: 'http://example.com/g.js', mode: 'auto' as const };
    expect(validateConfig(cfg)?.code).toBe('invalid-config');
  });

  it('valid auto config with game', () => {
    const cfg = { sitekey: 'k', game: '@org/g', games: null, gameSrc: null, mode: 'auto' as const };
    expect(validateConfig(cfg)).toBeNull();
  });

  it('valid form-submit config with game-src', () => {
    const cfg = { sitekey: 'k', game: null, games: null, gameSrc: 'https://example.com/g.js', mode: 'form-submit' as const };
    expect(validateConfig(cfg)).toBeNull();
  });

  it('valid manual config with no game', () => {
    const cfg = { sitekey: 'k', game: null, games: null, gameSrc: null, mode: 'manual' as const };
    expect(validateConfig(cfg)).toBeNull();
  });

  it('valid invisible default', () => {
    const cfg = { sitekey: 'k', game: null, games: null, gameSrc: null, mode: 'auto' as const };
    expect(validateConfig(cfg)).toBeNull();
  });
});

describe('parseAttributes', () => {
  it('reads all attributes', () => {
    const el = makeEl({ sitekey: 'k', game: '@org/g', games: 'a,b', 'game-src': 'https://x.com/g.js', mode: 'manual' });
    const cfg = parseAttributes(el);
    expect(cfg.sitekey).toBe('k');
    expect(cfg.game).toBe('@org/g');
    expect(cfg.games).toBe('a,b');
    expect(cfg.gameSrc).toBe('https://x.com/g.js');
    expect(cfg.mode).toBe('manual');
  });

  it('defaults mode to auto', () => {
    const el = makeEl({ sitekey: 'k' });
    expect(parseAttributes(el).mode).toBe('auto');
  });

  it('parses form-submit mode', () => {
    const el = makeEl({ sitekey: 'k', mode: 'form-submit' });
    expect(parseAttributes(el).mode).toBe('form-submit');
  });
});
