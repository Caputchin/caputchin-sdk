import { describe, it, expect } from 'vitest';
import { collectSkinAssetOrigins } from '../../../src/bootstrap/asset-origins.js';
import type { ResolvedSkin } from '@caputchin/game-sdk';

function skin(values: Record<string, unknown>): ResolvedSkin {
  return { _theme: 'light', ...values } as ResolvedSkin;
}

describe('collectSkinAssetOrigins', () => {
  it('returns [] for null skin', () => {
    expect(collectSkinAssetOrigins(null)).toEqual([]);
  });

  it('extracts the origin (not the full URL) from an http(s) asset value', () => {
    expect(collectSkinAssetOrigins(skin({ logo: 'https://cdn.acme.com/brand/logo.png?v=2' }))).toEqual([
      'https://cdn.acme.com',
    ]);
  });

  it('dedupes origins across fields, keeps the port', () => {
    const result = collectSkinAssetOrigins(
      skin({ logo: 'https://cdn.acme.com/a.png', icon: 'https://cdn.acme.com/b.png', sound: 'https://media.acme.com:8443/x.mp3' })
    );
    expect(result.sort()).toEqual(['https://cdn.acme.com', 'https://media.acme.com:8443']);
  });

  it('skips colors, data: URIs, bundle-relative paths, and non-string values', () => {
    const result = collectSkinAssetOrigins(
      skin({
        primary: '#0a0a0a',
        inline: 'data:image/svg+xml;base64,abc',
        rel: './assets/leaf.svg',
        count: 3 as unknown as string,
      })
    );
    expect(result).toEqual([]);
  });
});
