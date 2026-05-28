import { describe, it, expect } from 'vitest';
import { buildWidgetShell } from '../../../src/locale/widget-shell.js';
import type { ResolvedLocale } from '@caputchin/game-sdk';

// The SERVER resolves the shell locale (resolution is gated by the
// platform's relocated golden tests). buildWidgetShell only adapts the resolved
// locale → the typed WidgetShell, with a bundled English fallback.
describe('buildWidgetShell', () => {
  it('null resolved → bundled English fallback (ltr)', () => {
    const s = buildWidgetShell(null);
    expect(s.lang).toBe('en');
    expect(s.direction).toBe('ltr');
    expect(s.strings.simpleVerify).toBe('Verify');
    expect(s.strings.brandName).toBe('Caputchin');
  });

  it('applies the server-resolved locale (lang, direction, strings)', () => {
    const resolved = { _lang: 'ar', _direction: 'rtl', simpleVerify: 'تحقق' } as unknown as ResolvedLocale;
    const s = buildWidgetShell(resolved);
    expect(s.lang).toBe('ar');
    expect(s.direction).toBe('rtl');
    expect(s.strings.simpleVerify).toBe('تحقق');
    // A key the resolved preset didn't carry falls back to the bundled string.
    expect(s.strings.brandName).toBe('Caputchin');
  });
});
