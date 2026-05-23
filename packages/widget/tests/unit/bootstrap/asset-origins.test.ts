import { describe, it, expect } from 'vitest';
import { collectSkinAssetOrigins } from '../../../src/bootstrap/asset-origins.js';
import type { OverridesPerAxis } from '../../../src/bootstrap/types.js';

function overrides(skinPresets: Record<string, Record<string, unknown>> | null): OverridesPerAxis {
  return {
    locale: null,
    skin: skinPresets ? { presets: skinPresets } : null,
    configuration: null,
  };
}

describe('collectSkinAssetOrigins', () => {
  it('returns [] for null overrides or no skin bank', () => {
    expect(collectSkinAssetOrigins(null)).toEqual([]);
    expect(collectSkinAssetOrigins(overrides(null))).toEqual([]);
  });

  it('extracts the origin (not the full URL) from an http(s) asset value', () => {
    const result = collectSkinAssetOrigins(
      overrides({ midnight: { logo: 'https://cdn.acme.com/brand/logo.png?v=2' } })
    );
    expect(result).toEqual(['https://cdn.acme.com']);
  });

  it('dedupes origins across presets and fields, keeps the port', () => {
    const result = collectSkinAssetOrigins(
      overrides({
        a: { logo: 'https://cdn.acme.com/a.png', icon: 'https://cdn.acme.com/b.png' },
        b: { sound: 'https://media.acme.com:8443/x.mp3' },
      })
    );
    expect(result.sort()).toEqual(['https://cdn.acme.com', 'https://media.acme.com:8443']);
  });

  it('skips colors, data: URIs, bundle-relative paths, and non-string values', () => {
    const result = collectSkinAssetOrigins(
      overrides({
        p: {
          primary: '#0a0a0a',
          inline: 'data:image/svg+xml;base64,abc',
          rel: './assets/leaf.svg',
          count: 3,
          flag: true,
        },
      })
    );
    expect(result).toEqual([]);
  });
});
