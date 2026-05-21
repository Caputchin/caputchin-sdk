import { describe, it, expect } from 'vitest';
import { resolveWidgetShellConfig } from '../../../src/configurations/widget-shell-config.js';
import widgetManifest from '../../../caputchin.json';

const DEFAULT_PRESET = widgetManifest.configurations.presets.default as Record<string, string | boolean | number>;

describe('resolveWidgetShellConfig', () => {
  it('attr=null returns the bundled default preset values', () => {
    const r = resolveWidgetShellConfig(null);
    expect(r.values.home_link).toBe(DEFAULT_PRESET['home_link']);
    expect(r.values.legal_link).toBe(DEFAULT_PRESET['legal_link']);
    expect(r.issues).toHaveLength(0);
  });

  it('attr="auto" returns the same default', () => {
    const r = resolveWidgetShellConfig('auto');
    expect(r.values.home_link).toBe('https://caputchin.com');
    expect(r.values.legal_link).toBe('https://caputchin.com/legal');
  });

  it('inline JSON is rejected, emits issue, cascades to auto', () => {
    const r = resolveWidgetShellConfig('{"home_link":"https://attacker.example"}');
    expect(r.issues.some((m) => m.includes('does not accept inline JSON'))).toBe(true);
    expect(r.values.home_link).toBe('https://caputchin.com');
  });

  it('unknown preset name emits issue + cascades to auto', () => {
    const r = resolveWidgetShellConfig('not-a-preset');
    expect(r.issues.length).toBeGreaterThan(0);
    expect(r.values.home_link).toBe('https://caputchin.com');
  });

  // Drift guard mirroring the skin/lang pattern: the in-code
  // HARDCODED_DEFAULT mirrors the bundled JSON's `default` preset.
  it('every key in the bundled default JSON preset matches the resolved values', () => {
    const r = resolveWidgetShellConfig('default');
    for (const [key, jsonValue] of Object.entries(DEFAULT_PRESET)) {
      if (key.startsWith('_')) continue;
      expect(r.values[key as keyof typeof r.values], `default preset key "${key}"`).toBe(jsonValue);
    }
  });
});
