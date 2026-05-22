import { describe, it, expect } from 'vitest';
import { resolveWidgetShell } from '../../../src/locale/widget-shell.js';

describe('resolveWidgetShell — browser-auto path', () => {
  it('defaults to en + ltr when no navigator hint provided', () => {
    const shell = resolveWidgetShell(null, []);
    expect(shell.iso).toBe('en');
    expect(shell.direction).toBe('ltr');
    expect(shell.strings.simpleVerify).toBe('Verify');
    expect(shell.strings.brandName).toBe('Caputchin');
    expect(shell.strings.brandTag).toBe('see no data');
    expect(shell.issues).toEqual([]);
  });

  it('resolves to ar + rtl when navigator language is ar', () => {
    const shell = resolveWidgetShell(null, ['ar']);
    expect(shell.iso).toBe('ar');
    expect(shell.direction).toBe('rtl');
    expect(shell.strings.simpleVerify).toBe('تحقق');
    expect(shell.strings.brandName).toBe('كابوتشين');
    expect(shell.strings.overlayClose).toBe('إغلاق');
  });

  it('normalizes "ar-EG" to ar via primary subtag', () => {
    const shell = resolveWidgetShell(null, ['ar-EG']);
    expect(shell.iso).toBe('ar');
    expect(shell.direction).toBe('rtl');
  });

  it('falls back to en when navigator language has no matching preset', () => {
    const shell = resolveWidgetShell(null, ['ja']);
    expect(shell.iso).toBe('en');
    expect(shell.direction).toBe('ltr');
  });

  it('treats locale="auto" the same as null/omitted', () => {
    const shell = resolveWidgetShell('auto', ['ar']);
    expect(shell.iso).toBe('ar');
    expect(shell.direction).toBe('rtl');
  });
});

describe('resolveWidgetShell — explicit lang attr', () => {
  it('resolves preset name (ar) from a browser that prefers en', () => {
    const shell = resolveWidgetShell('ar', ['en']);
    expect(shell.iso).toBe('ar');
    expect(shell.direction).toBe('rtl');
    expect(shell.strings.simpleVerify).toBe('تحقق');
    expect(shell.issues).toEqual([]);
  });

  it('resolves ISO code ("ar-EG" → ar) from a browser that prefers en', () => {
    const shell = resolveWidgetShell('ar-EG', ['en']);
    expect(shell.iso).toBe('ar');
    expect(shell.direction).toBe('rtl');
    expect(shell.issues).toEqual([]);
  });

  it('unknown value emits an issue and falls back to browser-auto', () => {
    const shell = resolveWidgetShell('xyz', ['ar']);
    expect(shell.iso).toBe('ar');
    expect(shell.issues.some((m) => /xyz/.test(m))).toBe(true);
  });

  it('inline JSON is rejected on the widget; emits issue + falls back to auto', () => {
    const shell = resolveWidgetShell('{"_iso":"ar"}', ['en']);
    expect(shell.iso).toBe('en');
    expect(shell.issues.some((m) => /inline JSON/i.test(m))).toBe(true);
  });
});
