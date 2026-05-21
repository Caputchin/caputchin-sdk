import { describe, it, expect } from 'vitest';
import { resolveWidgetShellSkin } from '../../../src/skin/widget-shell-skin.js';

describe('resolveWidgetShellSkin', () => {
  it('attr=null + prefersDark=false → light palette', () => {
    const r = resolveWidgetShellSkin(null, false);
    expect(r.mode).toBe('light');
    expect(r.palette.primary).toBe('#2F6640');
    expect(r.palette.surface_bg).toBe('#ffffff');
    expect(r.issues).toHaveLength(0);
  });
  it('attr=null + prefersDark=true → dark palette', () => {
    const r = resolveWidgetShellSkin(null, true);
    expect(r.mode).toBe('dark');
    expect(r.palette.primary).toBe('#4E9B65');
    expect(r.palette.surface_bg).toBe('#182518');
  });
  it('attr="dark" overrides system (prefersDark=false)', () => {
    const r = resolveWidgetShellSkin('dark', false);
    expect(r.mode).toBe('dark');
    expect(r.palette.primary).toBe('#4E9B65');
  });
  it('attr="light" overrides system (prefersDark=true)', () => {
    const r = resolveWidgetShellSkin('light', true);
    expect(r.mode).toBe('light');
    expect(r.palette.primary).toBe('#2F6640');
  });
  it('attr="auto" + prefersDark=true → dark', () => {
    const r = resolveWidgetShellSkin('auto', true);
    expect(r.mode).toBe('dark');
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
    expect(r.mode).toBe('light');
  });
  it('inline JSON is rejected, emits issue, cascades to auto', () => {
    const r = resolveWidgetShellSkin('{"_mode":"dark","primary":"#ff0000"}', false);
    expect(r.issues.some((m) => m.includes('does not accept inline JSON'))).toBe(true);
    expect(r.mode).toBe('light');
    // primary stays at the light preset's value, NOT the inline override
    expect(r.palette.primary).toBe('#2F6640');
  });
});
