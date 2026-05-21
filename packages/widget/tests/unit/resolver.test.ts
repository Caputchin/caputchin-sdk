import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchMarketplaceResolution } from '../../src/resolver.js';

const API_HOST = 'https://api.example.com';

describe('fetchMarketplaceResolution', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns ok:true on 200', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(
      JSON.stringify({ url: 'https://cdn.example.com/game.js', integrity: 'sha384-abc' }),
      { status: 200 }
    ));
    const r = await fetchMarketplaceResolution('@org/game', API_HOST);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.url).toBe('https://cdn.example.com/game.js');
      expect(r.integrity).toBe('sha384-abc');
    }
  });

  it('returns ok:false on 404', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('not found', { status: 404 }));
    const r = await fetchMarketplaceResolution('@org/game', API_HOST);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('resolve-failed');
  });

  it('returns ok:false on network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network fail'));
    const r = await fetchMarketplaceResolution('@org/game', API_HOST);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('resolve-failed');
  });

  it('encodes game ID in the URL query string', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(
      JSON.stringify({ url: 'https://x.com/g.js', integrity: 'sha384-x' }),
      { status: 200 }
    ));
    await fetchMarketplaceResolution('@org/my game', API_HOST);
    const calledUrl = (vi.mocked(fetch).mock.calls[0]![0] as string);
    // URLSearchParams encodes per application/x-www-form-urlencoded: space → `+`,
    // `@` → `%40`, `/` → `%2F`. Servers decode both `+` and `%20` as space, so
    // the wire format is interoperable.
    expect(calledUrl).toContain('game=%40org%2Fmy+game');
  });

  it('builds the URL against the new resolve endpoint shape (ADR-0058)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(
      JSON.stringify({ url: 'https://x.com/g.js', integrity: 'sha384-x' }),
      { status: 200 }
    ));
    await fetchMarketplaceResolution('caputchin/games/leaf-memory', API_HOST);
    const calledUrl = (vi.mocked(fetch).mock.calls[0]![0] as string);
    expect(calledUrl).toBe(
      'https://api.example.com/api/v1/games/resolve?game=caputchin%2Fgames%2Fleaf-memory'
    );
  });
});
