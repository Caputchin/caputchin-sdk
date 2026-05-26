import { describe, it, expect } from 'vitest';
import { resolveWidgetShellConfig } from '../../../src/configurations/widget-shell-config.js';
import widgetManifest from '../../../caputchin.json';

const DEFAULT_PRESET = widgetManifest.configurations.presets.default as Record<string, string | boolean | number>;

// There is no client `config` attribute (removed under ADR-0069 — shell config is
// server-authoritative). The resolver always targets the bundled `default`
// preset, optionally overlaid by the server's override bank (from bootstrap).
describe('resolveWidgetShellConfig', () => {
  it('no override returns the bundled default preset values', () => {
    const r = resolveWidgetShellConfig();
    expect(r.values.home_link).toBe(DEFAULT_PRESET['home_link']);
    expect(r.values.legal_link).toBe(DEFAULT_PRESET['legal_link']);
    expect(r.issues).toHaveLength(0);
  });

  it('null override returns the bundled default', () => {
    const r = resolveWidgetShellConfig(null);
    expect(r.values.home_link).toBe('https://caputchin.com');
    expect(r.values.legal_link).toBe('https://caputchin.com/legal');
    expect(r.issues).toHaveLength(0);
  });

  it('a server override bank overlays the bundled default', () => {
    const r = resolveWidgetShellConfig({
      default: { _default: true, home_link: 'https://override.example', legal_link: 'https://override.example/legal' },
    });
    expect(r.values.home_link).toBe('https://override.example');
    expect(r.values.legal_link).toBe('https://override.example/legal');
    expect(r.issues).toHaveLength(0);
  });

  // Drift guard mirroring the skin/lang pattern: the in-code
  // HARDCODED_DEFAULT mirrors the bundled JSON's `default` preset.
  it('every key in the bundled default JSON preset matches the resolved values', () => {
    const r = resolveWidgetShellConfig();
    for (const [key, jsonValue] of Object.entries(DEFAULT_PRESET)) {
      if (key.startsWith('_')) continue;
      expect(r.values[key as keyof typeof r.values], `default preset key "${key}"`).toBe(jsonValue);
    }
  });
});
