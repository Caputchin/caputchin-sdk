import { describe, it, expect } from 'vitest';
import type { LocalePreset } from '@caputchin/game-sdk';
import { resolveLocale } from '../../../src/locale/resolver.js';

type Presets = Record<string, LocalePreset>;

function presetsOf(p: Presets): Presets {
  return p;
}

describe('resolveLocale — preset name lookup', () => {
  it('matches preset by exact case-sensitive name', () => {
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi' },
      ar: { _iso: 'ar', _default: true, hello: 'مرحبا' },
    });
    const { resolved, issues } = resolveLocale(presets, 'ar', ['en']);
    expect(resolved).toEqual({ _iso: 'ar', _direction: 'rtl', hello: 'مرحبا' });
    expect(issues).toEqual([]);
  });

  it('does not match preset name case-insensitively', () => {
    const presets = presetsOf({
      Arabic: { _iso: 'ar', _default: true, hello: 'مرحبا' },
    });
    const { resolved, issues } = resolveLocale(presets, 'arabic', ['en']);
    // Preset name "Arabic" not matched by "arabic"; iso "arabic" doesn't normalize to "ar"; auto cascade.
    expect(resolved).not.toBeNull();
    expect(resolved!._iso).toBe('ar');
    expect(issues.length).toBeGreaterThan(0);
  });
});

describe('resolveLocale — iso lookup', () => {
  it('matches a single preset by iso (case-insensitive)', () => {
    const presets = presetsOf({
      english: { _iso: 'en', hello: 'Hi' },
    });
    const { resolved } = resolveLocale(presets, 'EN', ['fr']);
    expect(resolved).toEqual({ _iso: 'en', _direction: 'ltr', hello: 'Hi' });
  });

  it('picks _default:true winner when multiple share an iso', () => {
    const presets = presetsOf({
      enUk: { _iso: 'en', hello: 'Cheers' },
      enUs: { _iso: 'en', _default: true, hello: 'Hi' },
      enAu: { _iso: 'en', hello: 'Gday' },
    });
    const { resolved } = resolveLocale(presets, 'en', []);
    expect(resolved!['hello']).toBe('Hi');
  });

  it('falls back to first declared when no _default in the iso bucket', () => {
    const presets = presetsOf({
      enUk: { _iso: 'en', hello: 'Cheers' },
      enUs: { _iso: 'en', hello: 'Hi' },
    });
    const { resolved } = resolveLocale(presets, 'en', []);
    expect(resolved!['hello']).toBe('Cheers');
  });

  it('normalizes primary subtag of multi-part iso ("en-GB" → "en")', () => {
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi' },
    });
    const { resolved } = resolveLocale(presets, 'en-GB', []);
    expect(resolved!['hello']).toBe('Hi');
  });
});

describe('resolveLocale — auto cascade', () => {
  it('matches the first navigator.languages entry by primary subtag', () => {
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi' },
      de: { _iso: 'de', _default: true, hello: 'Hallo' },
    });
    const { resolved } = resolveLocale(presets, 'auto', ['de-DE', 'en']);
    expect(resolved!['hello']).toBe('Hallo');
  });

  it('falls back to iso=en when no navigator language matches', () => {
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi' },
      ar: { _iso: 'ar', _default: true, hello: 'مرحبا' },
    });
    const { resolved } = resolveLocale(presets, 'auto', ['ja']);
    expect(resolved!['hello']).toBe('Hi');
  });

  it('falls back to first declared preset when no en preset exists', () => {
    const presets = presetsOf({
      ar: { _iso: 'ar', _default: true, hello: 'مرحبا' },
      he: { _iso: 'he', hello: 'שלום' },
    });
    const { resolved } = resolveLocale(presets, 'auto', ['ja']);
    expect(resolved!['hello']).toBe('مرحبا');
  });

  it('returns null when no presets are defined at all', () => {
    const { resolved, issues } = resolveLocale(null, 'auto', ['en']);
    expect(resolved).toBeNull();
    expect(issues).toEqual([]);
  });

  it('returns null when presets is empty object', () => {
    const { resolved } = resolveLocale({}, 'auto', ['en']);
    expect(resolved).toBeNull();
  });

  it('treats null attrValue the same as "auto"', () => {
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi' },
    });
    const { resolved } = resolveLocale(presets, null, ['en']);
    expect(resolved!['hello']).toBe('Hi');
  });
});

describe('resolveLocale — direction auto-derive', () => {
  it('auto-derives rtl for arabic when _direction omitted', () => {
    const presets = presetsOf({
      ar: { _iso: 'ar', _default: true, hello: 'مرحبا' },
    });
    const { resolved } = resolveLocale(presets, 'ar', []);
    expect(resolved!._direction).toBe('rtl');
  });

  it('explicit _direction overrides auto-derive', () => {
    const presets = presetsOf({
      ar: { _iso: 'ar', _direction: 'ltr', _default: true, hello: 'مرحبا' },
    });
    const { resolved } = resolveLocale(presets, 'ar', []);
    expect(resolved!._direction).toBe('ltr');
  });

  it('auto-derives ltr for english', () => {
    const presets = presetsOf({
      en: { _iso: 'en', hello: 'Hi' },
    });
    const { resolved } = resolveLocale(presets, 'en', []);
    expect(resolved!._direction).toBe('ltr');
  });

  it('auto-derives rtl for he, fa, ur, yi, ps, sd', () => {
    for (const iso of ['he', 'fa', 'ur', 'yi', 'ps', 'sd']) {
      const presets = presetsOf({ p: { _iso: iso, hello: 'h' } });
      const { resolved } = resolveLocale(presets, iso, []);
      expect(resolved!._direction).toBe('rtl');
    }
  });
});

describe('resolveLocale — _extends chain merge', () => {
  it('child overrides base text key', () => {
    const presets = presetsOf({
      base: { _iso: 'en', hello: 'Hi', bye: 'Bye' },
      child: { _extends: 'base', hello: 'Hello!' },
    });
    const { resolved } = resolveLocale(presets, 'child', []);
    expect(resolved!['hello']).toBe('Hello!');
    expect(resolved!['bye']).toBe('Bye');
    expect(resolved!._iso).toBe('en');
  });

  it('child inherits iso/direction from base when omitted', () => {
    const presets = presetsOf({
      arBase: { _iso: 'ar', hello: 'مرحبا' },
      childAr: { _extends: 'arBase', greeting: 'Hi' },
    });
    const { resolved } = resolveLocale(presets, 'childAr', []);
    expect(resolved!._iso).toBe('ar');
    expect(resolved!._direction).toBe('rtl');
  });

  it('extends via iso code resolves through _default winner', () => {
    const presets = presetsOf({
      enFormal: { _iso: 'en', _default: true, hello: 'Good day' },
      enCasual: { _iso: 'en', hello: 'Hi' },
      extended: { _extends: 'en', greeting: 'Yo' },
    });
    const { resolved } = resolveLocale(presets, 'extended', []);
    expect(resolved!['hello']).toBe('Good day');
    expect(resolved!['greeting']).toBe('Yo');
  });

  it('rejects circular _extends chain and emits an issue', () => {
    const presets = presetsOf({
      a: { _extends: 'b', hello: 'A' },
      b: { _extends: 'a', hello: 'B' },
      en: { _iso: 'en', _default: true, hello: 'Hi' },
    });
    const { resolved, issues } = resolveLocale(presets, 'a', ['en']);
    expect(issues.some((m) => /circular/i.test(m))).toBe(true);
    // Cascades to auto = en.
    expect(resolved!._iso).toBe('en');
  });

  it('rejects chain when _extends target is missing and emits an issue', () => {
    const presets = presetsOf({
      child: { _extends: 'ghost', hello: 'Hi' },
      en: { _iso: 'en', _default: true, hello: 'Hello' },
    });
    const { resolved, issues } = resolveLocale(presets, 'child', ['en']);
    expect(issues.some((m) => /ghost/.test(m))).toBe(true);
    expect(resolved!['hello']).toBe('Hello');
  });

  it('honors max depth cap and emits a depth issue', () => {
    const presets: Presets = { l9: { _iso: 'en', hello: 'leaf' } };
    let prev = 'l9';
    for (let i = 8; i >= 0; i--) {
      const name = `l${i}`;
      presets[name] = { _extends: prev, [`tag${i}`]: `t${i}` };
      prev = name;
    }
    const { resolved, issues } = resolveLocale(presets, 'l0', ['en']);
    expect(issues.some((m) => /depth/i.test(m))).toBe(true);
    expect(resolved).not.toBeNull();
  });
});

describe('resolveLocale — inline JSON', () => {
  it('parses inline JSON with explicit _extends and merges chain', () => {
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi', bye: 'Bye' },
    });
    const inline = JSON.stringify({ _extends: 'en', hello: 'Howdy' });
    const { resolved } = resolveLocale(presets, inline, []);
    expect(resolved!['hello']).toBe('Howdy');
    expect(resolved!['bye']).toBe('Bye');
    expect(resolved!._iso).toBe('en');
  });

  it('inline JSON without _extends layers atop auto-resolved base', () => {
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi', bye: 'Bye' },
    });
    const inline = JSON.stringify({ hello: 'Hey' });
    const { resolved } = resolveLocale(presets, inline, ['en']);
    expect(resolved!['hello']).toBe('Hey');
    expect(resolved!['bye']).toBe('Bye');
  });

  it('inline JSON without _extends still adopts explicit _iso + _direction', () => {
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi' },
    });
    const inline = JSON.stringify({ _iso: 'ar', hello: 'مرحبا' });
    const { resolved } = resolveLocale(presets, inline, ['en']);
    expect(resolved!._iso).toBe('ar');
    expect(resolved!._direction).toBe('rtl');
    expect(resolved!['hello']).toBe('مرحبا');
  });

  it('inline JSON with _iso uses it as implicit _extends (pulls iso base strings)', () => {
    // Browser prefers en, customer passes `{ _iso: "ar", overrideKey: "X" }`.
    // Old behavior layered atop the en (auto) base — surprising because
    // declaring _iso=ar means "I want ar". New behavior treats _iso as
    // implicit _extends so unspecified keys come from the ar preset.
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi', bye: 'Bye' },
      ar: { _iso: 'ar', _default: true, hello: 'مرحبا', bye: 'وداعا' },
    });
    const inline = JSON.stringify({ _iso: 'ar', bye: 'CUSTOM' });
    const { resolved } = resolveLocale(presets, inline, ['en']);
    expect(resolved!._iso).toBe('ar');
    expect(resolved!._direction).toBe('rtl');
    expect(resolved!['hello']).toBe('مرحبا'); // inherited from ar via implicit extends
    expect(resolved!['bye']).toBe('CUSTOM');   // inline override wins
  });

  it('inline JSON with _iso + _direction also pulls iso base via implicit _extends', () => {
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi' },
      ar: { _iso: 'ar', _default: true, hello: 'مرحبا' },
    });
    const inline = JSON.stringify({ _iso: 'ar', _direction: 'rtl', custom: 'X' });
    const { resolved } = resolveLocale(presets, inline, ['en']);
    expect(resolved!._iso).toBe('ar');
    expect(resolved!._direction).toBe('rtl');
    expect(resolved!['hello']).toBe('مرحبا');
    expect(resolved!['custom']).toBe('X');
  });

  it('inline JSON with _iso missing from presets falls back to auto + layers', () => {
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi' },
    });
    const inline = JSON.stringify({ _iso: 'xx', hello: 'CUSTOM' });
    const { resolved, issues } = resolveLocale(presets, inline, ['en']);
    // Implicit _extends: xx target is missing → fall through to layer-atop-auto.
    // Result: auto base (en) + inline overrides (_iso=xx wins, hello=CUSTOM wins).
    expect(resolved!._iso).toBe('xx');
    expect(resolved!['hello']).toBe('CUSTOM');
    expect(issues.length).toBeGreaterThan(0);
  });

  it('inline JSON with no _iso and no _extends layers atop auto base (unchanged)', () => {
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi', bye: 'Bye' },
    });
    const inline = JSON.stringify({ hello: 'Hey' });
    const { resolved } = resolveLocale(presets, inline, ['en']);
    expect(resolved!._iso).toBe('en');
    expect(resolved!['hello']).toBe('Hey');
    expect(resolved!['bye']).toBe('Bye');
  });

  it('inline malformed JSON emits issue and falls through to auto', () => {
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi' },
    });
    const { resolved, issues } = resolveLocale(presets, '{not json', ['en']);
    expect(issues.some((m) => /JSON/.test(m))).toBe(true);
    expect(resolved!['hello']).toBe('Hi');
  });

  it('inline non-object JSON emits issue and falls through to auto', () => {
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi' },
    });
    const { resolved, issues } = resolveLocale(presets, '{42}', ['en']);
    expect(issues.length).toBeGreaterThan(0);
    expect(resolved!._iso).toBe('en');
  });
});

describe('resolveLocale — rejectInlineJson option', () => {
  it('emits an issue and falls back to auto when inline JSON arrives under the flag', () => {
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi' },
      ar: { _iso: 'ar', _default: true, hello: 'مرحبا' },
    });
    const inline = JSON.stringify({ _iso: 'ar', hello: 'مرحبا' });
    const { resolved, issues } = resolveLocale(presets, inline, ['en'], { rejectInlineJson: true });
    expect(issues.some((m) => /inline JSON/i.test(m))).toBe(true);
    expect(resolved!._iso).toBe('en');
  });

  it('plain preset name still resolves under the flag', () => {
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi' },
      ar: { _iso: 'ar', _default: true, hello: 'مرحبا' },
    });
    const { resolved, issues } = resolveLocale(presets, 'ar', ['en'], { rejectInlineJson: true });
    expect(issues).toEqual([]);
    expect(resolved!._iso).toBe('ar');
  });
});

describe('resolveLocale — unknown attr value', () => {
  it('unknown preset and unknown iso emit issue and cascade to auto', () => {
    const presets = presetsOf({
      en: { _iso: 'en', _default: true, hello: 'Hi' },
    });
    const { resolved, issues } = resolveLocale(presets, 'xyz', ['en']);
    expect(issues.some((m) => /locale="xyz"/.test(m))).toBe(true);
    expect(resolved!._iso).toBe('en');
  });
});
