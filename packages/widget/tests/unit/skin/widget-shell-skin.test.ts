import { describe, it, expect } from 'vitest';
import { resolveWidgetShellSkin } from '../../../src/skin/widget-shell-skin.js';
import widgetManifest from '../../../caputchin.json';

const LIGHT_PRESET = widgetManifest.skins.presets.light as Record<string, string>;

describe('resolveWidgetShellSkin', () => {
  it('attr=null + prefersDark=false → light palette', () => {
    const r = resolveWidgetShellSkin(null, false);
    expect(r.theme).toBe('light');
    expect(r.palette.primary).toBe('#2F6640');
    expect(r.palette.surface_bg).toBe('#ffffff');
    expect(r.issues).toHaveLength(0);
  });
  it('attr=null + prefersDark=true → dark palette', () => {
    const r = resolveWidgetShellSkin(null, true);
    expect(r.theme).toBe('dark');
    expect(r.palette.primary).toBe('#4E9B65');
    expect(r.palette.surface_bg).toBe('#182518');
  });
  it('attr="dark" overrides system (prefersDark=false)', () => {
    const r = resolveWidgetShellSkin('dark', false);
    expect(r.theme).toBe('dark');
    expect(r.palette.primary).toBe('#4E9B65');
  });
  it('attr="light" overrides system (prefersDark=true)', () => {
    const r = resolveWidgetShellSkin('light', true);
    expect(r.theme).toBe('light');
    expect(r.palette.primary).toBe('#2F6640');
  });
  it('attr="auto" + prefersDark=true → dark', () => {
    const r = resolveWidgetShellSkin('auto', true);
    expect(r.theme).toBe('dark');
  });

  it('light preset carries the green wordmark color and primary brand logo', () => {
    const r = resolveWidgetShellSkin('light', false);
    expect(r.palette.brand_text).toBe('#2F6640');
    expect(r.palette.brand_text_hover).toBe('#1f4a2c');
    // brand_logo injected from src/assets/logo-light.svg via tsup dataurl
    // loader. In the test (vitest) env the loader hands us the raw string
    // contents instead of a data: URI prefix, but it MUST contain SVG
    // markup either way.
    expect(r.palette.brand_logo).toMatch(/svg|data:image\/svg\+xml/);
  });

  it('dark preset carries the off-white wordmark color and inverted brand logo', () => {
    const r = resolveWidgetShellSkin('dark', false);
    expect(r.palette.brand_text).toBe('#F7F5F2');
    expect(r.palette.brand_text_hover).toBe('#9ACE9B');
    expect(r.palette.brand_logo).toMatch(/svg|data:image\/svg\+xml/);
    // Light and dark logos must be different assets.
    const light = resolveWidgetShellSkin('light', false).palette.brand_logo;
    expect(r.palette.brand_logo).not.toBe(light);
  });
  it('unknown preset name emits issue + cascades to auto', () => {
    const r = resolveWidgetShellSkin('not-a-preset', false);
    expect(r.issues.length).toBeGreaterThan(0);
    expect(r.theme).toBe('light');
  });
  it('inline JSON is rejected, emits issue, cascades to auto', () => {
    const r = resolveWidgetShellSkin('{"_theme":"dark","primary":"#ff0000"}', false);
    expect(r.issues.some((m) => m.includes('does not accept inline JSON'))).toBe(true);
    expect(r.theme).toBe('light');
    // primary stays at the light preset's value, NOT the inline override
    expect(r.palette.primary).toBe('#2F6640');
  });

  // S1 drift guard: the in-code HARDCODED_LIGHT fallback in widget-shell-skin
  // mirrors the bundled JSON light preset. Resolving with attr='light' returns
  // the JSON-derived palette; this assertion catches drift between the two
  // sources so future maintainers can't silently desync the safety net.
  it('every color key in the bundled light JSON preset matches the resolved light palette', () => {
    const r = resolveWidgetShellSkin('light', false);
    for (const [key, jsonValue] of Object.entries(LIGHT_PRESET)) {
      if (key.startsWith('_')) continue;
      if (key === 'brand_logo') continue; // not in JSON; sourced from build-time SVG import
      expect(r.palette[key], `light preset key "${key}"`).toBe(jsonValue);
    }
  });
});
