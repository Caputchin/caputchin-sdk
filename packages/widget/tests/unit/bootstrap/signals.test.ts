import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveGameNextLangsSignal, resolveLocaleSignal, resolveNextLangsSignal, resolveSkinSignal } from '../../../src/bootstrap/signals.js';

// The two helpers the elements run BEFORE the bootstrap call to pre-resolve
// the `locale` / `skin` signal: when the attribute is missing / `auto`, fall
// back to the navigator language / `prefers-color-scheme`.

afterEach(() => vi.unstubAllGlobals());

describe('resolveLocaleSignal', () => {
  it('returns the explicit attribute verbatim when set', () => {
    expect(resolveLocaleSignal('ar')).toBe('ar');
    expect(resolveLocaleSignal('en-GB')).toBe('en-GB');
    // Inline JSON is passed through; the server resolves + validates it.
    expect(resolveLocaleSignal('{"_lang":"ar"}')).toBe('{"_lang":"ar"}');
  });

  it('treats missing / empty / `auto` as no attribute and falls back to the navigator language', () => {
    vi.stubGlobal('navigator', { languages: ['en-US', 'en'], language: 'en-US' });
    expect(resolveLocaleSignal(null)).toBe('en-US');
    expect(resolveLocaleSignal(undefined)).toBe('en-US');
    expect(resolveLocaleSignal('')).toBe('en-US');
    expect(resolveLocaleSignal('   ')).toBe('en-US');
    expect(resolveLocaleSignal('auto')).toBe('en-US');
    expect(resolveLocaleSignal('AUTO')).toBe('en-US');
  });

  it('falls back to navigator.language when navigator.languages is empty', () => {
    vi.stubGlobal('navigator', { languages: [], language: 'fr-FR' });
    expect(resolveLocaleSignal(null)).toBe('fr-FR');
  });

  it('returns null when neither attribute nor navigator is available', () => {
    vi.stubGlobal('navigator', undefined);
    expect(resolveLocaleSignal(null)).toBeNull();
  });
});

// The shell ships no Traditional Chinese, so a `zh-TW, ja` visitor also sends
// `ja` and gets Japanese, not English. Everyone the shell already speaks to
// sends one language, keeping the bootstrap cache key small.
describe('resolveNextLangsSignal', () => {
  it.each(['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-CN'])('sends the next two languages after %s', (primary) => {
    vi.stubGlobal('navigator', { languages: [primary, 'ja', 'en', 'de'] });
    expect(resolveNextLangsSignal(null)).toEqual(['ja', 'en']);
    expect(resolveNextLangsSignal('auto')).toEqual(['ja', 'en']);
  });

  it('sends next languages after any language the shell does not ship', () => {
    vi.stubGlobal('navigator', { languages: ['sv-SE', 'de-AT'] });
    expect(resolveNextLangsSignal(null)).toEqual(['de']);
  });

  it.each(['en-US', 'zh-CN', 'zh', 'zh-Hans-TW', 'pt-BR', 'ko'])('sends nothing after a shipped language (%s)', (primary) => {
    vi.stubGlobal('navigator', { languages: [primary, 'ja'] });
    expect(resolveNextLangsSignal(null)).toBeNull();
  });

  it('sends nothing when the locale attribute is set, or there is no next language', () => {
    vi.stubGlobal('navigator', { languages: ['zh-TW', 'ja'] });
    expect(resolveNextLangsSignal('zh-TW')).toBeNull();
    vi.stubGlobal('navigator', { languages: ['zh-TW'], language: 'zh-TW' });
    expect(resolveNextLangsSignal(null)).toBeNull();
    vi.stubGlobal('navigator', undefined);
    expect(resolveNextLangsSignal(null)).toBeNull();
  });

  it('skips next languages that share a match key with an earlier one', () => {
    vi.stubGlobal('navigator', { languages: ['zh-TW', 'zh-HK', 'zh-Hant', 'ja', 'ja-JP', 'de'] });
    expect(resolveNextLangsSignal(null)).toEqual(['ja', 'de']);
  });
});

// The game's own presets decide the language and the element cannot know them
// before the bootstrap, so the game sends the next languages after ANY primary.
describe('resolveGameNextLangsSignal', () => {
  it.each(['ko', 'en-US', 'zh-TW'])('sends the next two languages after %s', (primary) => {
    vi.stubGlobal('navigator', { languages: [primary, 'ja', 'fr', 'de'] });
    expect(resolveGameNextLangsSignal(null)).toEqual(['ja', 'fr']);
    expect(resolveGameNextLangsSignal('auto')).toEqual(['ja', 'fr']);
  });

  it('sends nothing when every next language shares the primary one\'s match key', () => {
    vi.stubGlobal('navigator', { languages: ['en-US', 'en', 'en-GB'] });
    expect(resolveGameNextLangsSignal(null)).toBeNull();
  });

  it('keeps Traditional and Simplified Chinese apart', () => {
    vi.stubGlobal('navigator', { languages: ['zh-TW', 'zh-CN'] });
    expect(resolveGameNextLangsSignal(null)).toEqual(['zh-hans']);
    vi.stubGlobal('navigator', { languages: ['zh-CN', 'zh-HK'] });
    expect(resolveGameNextLangsSignal(null)).toEqual(['zh-hant']);
  });

  it('sends match keys, so every spelling of a language is one cache key', () => {
    for (const tag of ['ja', 'ja-JP', 'JA-jp', 'ja_JP']) {
      vi.stubGlobal('navigator', { languages: ['ko', tag, 'pt-BR'] });
      expect(resolveGameNextLangsSignal(null)).toEqual(['ja', 'pt']);
    }
  });

  it('sends nothing when the locale attribute is set, or there is no next language', () => {
    vi.stubGlobal('navigator', { languages: ['ko', 'ja'] });
    expect(resolveGameNextLangsSignal('ko')).toBeNull();
    vi.stubGlobal('navigator', { languages: ['ko'], language: 'ko' });
    expect(resolveGameNextLangsSignal(null)).toBeNull();
    vi.stubGlobal('navigator', undefined);
    expect(resolveGameNextLangsSignal(null)).toBeNull();
  });
});

describe('resolveSkinSignal', () => {
  it('returns the explicit attribute verbatim when set', () => {
    expect(resolveSkinSignal('dark')).toBe('dark');
    expect(resolveSkinSignal('light')).toBe('light');
    expect(resolveSkinSignal('midnight')).toBe('midnight');
    expect(resolveSkinSignal('{"_theme":"dark"}')).toBe('{"_theme":"dark"}');
  });

  it('falls back to `dark` when no attribute is set and prefers-color-scheme is dark', () => {
    vi.stubGlobal('window', { matchMedia: (q: string) => ({ matches: q.includes('dark') }) });
    expect(resolveSkinSignal(null)).toBe('dark');
    expect(resolveSkinSignal('')).toBe('dark');
    expect(resolveSkinSignal('auto')).toBe('dark');
  });

  it('falls back to `light` when no attribute and the visitor does not prefer dark', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    expect(resolveSkinSignal(null)).toBe('light');
    expect(resolveSkinSignal('auto')).toBe('light');
  });
});
