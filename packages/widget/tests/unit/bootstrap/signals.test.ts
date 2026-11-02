import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveLocaleSignal, resolveNextLangsSignal, resolveSkinSignal } from '../../../src/bootstrap/signals.js';

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
    vi.stubGlobal('navigator', { languages: ['sv-SE', 'de'] });
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
