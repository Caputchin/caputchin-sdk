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

  it('encodes game ID in URL', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(
      JSON.stringify({ url: 'https://x.com/g.js', integrity: 'sha384-x' }),
      { status: 200 }
    ));
    await fetchMarketplaceResolution('@org/my game', API_HOST);
    const calledUrl = (vi.mocked(fetch).mock.calls[0]![0] as string);
    expect(calledUrl).toContain('%40org%2Fmy%20game');
  });
});
