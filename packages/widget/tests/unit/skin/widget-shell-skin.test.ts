import { describe, it, expect } from 'vitest';
import { buildWidgetShellSkin } from '../../../src/skin/widget-shell-skin.js';
import type { ResolvedSkin } from '@caputchin/game-sdk';
import widgetManifest from '../../../caputchin.json';

// The SERVER resolves the shell skin (resolution gated by the
// platform's relocated golden tests). buildWidgetShellSkin adapts the resolved
// skin → the typed WidgetShellSkin + injects the theme-matched bundled brand
// logo, with a bundled light / dark fallback picked by the skin signal.
describe('buildWidgetShellSkin', () => {
  it('null resolved → bundled light fallback + light brand logo', () => {
    const s = buildWidgetShellSkin(null);
    expect(s.theme).toBe('light');
    expect(typeof s.palette.primary).toBe('string');
    expect(s.palette.brand_logo).toMatch(/^data:image\/svg/);
  });

  it('null resolved + dark signal → bundled dark preset + dark brand logo', () => {
    const light = buildWidgetShellSkin(null);
    const s = buildWidgetShellSkin(null, 'dark');
    expect(s.theme).toBe('dark');
    // Values come from caputchin.json's bundled `dark` preset.
    expect(s.palette.surface_bg).toBe(widgetManifest.skins.presets.dark.surface_bg);
    expect(s.palette.text_label).toBe(widgetManifest.skins.presets.dark.text_label);
    expect(s.palette.brand_logo).toMatch(/^data:image\/svg/);
    expect(s.palette.brand_logo).not.toBe(light.palette.brand_logo);
  });

  it('null resolved + light / custom-preset signal → bundled light preset', () => {
    for (const signal of ['light', 'midnight', null, undefined]) {
      const s = buildWidgetShellSkin(null, signal);
      expect(s.theme).toBe('light');
      expect(s.palette.surface_bg).toBe(widgetManifest.skins.presets.light.surface_bg);
    }
  });

  it('a resolved skin wins over the fallback signal', () => {
    const resolved = { _theme: 'light', primary: '#abcdef' } as unknown as ResolvedSkin;
    const s = buildWidgetShellSkin(resolved, 'dark');
    expect(s.theme).toBe('light');
    expect(s.palette.primary).toBe('#abcdef');
  });

  it('applies the server-resolved skin (theme + palette) + theme-matched brand logo', () => {
    const resolved = { _theme: 'dark', primary: '#abcdef' } as unknown as ResolvedSkin;
    const s = buildWidgetShellSkin(resolved);
    expect(s.theme).toBe('dark');
    expect(s.palette.primary).toBe('#abcdef');
    // brand_logo not in the resolved preset → theme-matched bundled logo injected.
    expect(s.palette.brand_logo).toMatch(/^data:image\/svg/);
  });

  it('a resolved brand_logo override wins over the bundled logo', () => {
    const resolved = { _theme: 'light', brand_logo: 'https://cdn.acme.com/logo.png' } as unknown as ResolvedSkin;
    expect(buildWidgetShellSkin(resolved).palette.brand_logo).toBe('https://cdn.acme.com/logo.png');
  });
});
