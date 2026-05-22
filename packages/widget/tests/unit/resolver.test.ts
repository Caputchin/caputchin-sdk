import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchMarketplaceResolution } from '../../src/resolver.js';

const API_HOST = 'https://api.example.com';
const SITE_KEY = 'cpt_pub_test';

describe('fetchMarketplaceResolution (calls /api/v1/widget/bootstrap per ADR-0059)', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns ok:true on 200 with game.url + game.integrity', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(
      JSON.stringify({
        widget: { overrides: { locale: null, skin: null, configuration: null } },
        game: { url: 'https://cdn.example.com/game.js', integrity: 'sha384-abc', overrides: null },
      }),
      { status: 200 }
    ));
    const r = await fetchMarketplaceResolution('@org/game', API_HOST, SITE_KEY);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.url).toBe('https://cdn.example.com/game.js');
      expect(r.integrity).toBe('sha384-abc');
    }
  });

  it('returns ok:false on missing sitekey (marketplace requires sitekey post-ADR-0059)', async () => {
    const r = await fetchMarketplaceResolution('@org/game', API_HOST, null);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('resolve-failed');
      expect(r.message).toContain('requires a sitekey');
    }
    // No network call attempted.
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('returns ok:false on 401 (invalid sitekey)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'invalid-sitekey' }), { status: 401 }));
    const r = await fetchMarketplaceResolution('@org/game', API_HOST, SITE_KEY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('resolve-failed');
  });

  it('returns ok:false when game block exists but url is null (wrapper / customer-hosted)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(
      JSON.stringify({
        widget: null,
        game: { url: null, integrity: null, overrides: null },
      }),
      { status: 200 }
    ));
    const r = await fetchMarketplaceResolution('caputchin/games', API_HOST, SITE_KEY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('no marketplace bundle');
  });

  it('returns ok:false on network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network fail'));
    const r = await fetchMarketplaceResolution('@org/game', API_HOST, SITE_KEY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('resolve-failed');
  });

  it('encodes sitekey + game id in the URL query string', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(
      JSON.stringify({ widget: null, game: { url: 'https://x.com/g.js', integrity: 'sha384-x', overrides: null } }),
      { status: 200 }
    ));
    await fetchMarketplaceResolution('@org/my game', API_HOST, SITE_KEY);
    const calledUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(calledUrl).toContain('sitekey=cpt_pub_test');
    // URLSearchParams encoding: space → `+`, `@` → `%40`, `/` → `%2F`.
    expect(calledUrl).toContain('game=%40org%2Fmy+game');
  });

  it('builds the URL against the bootstrap endpoint shape', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(
      JSON.stringify({ widget: null, game: { url: 'https://x.com/g.js', integrity: 'sha384-x', overrides: null } }),
      { status: 200 }
    ));
    await fetchMarketplaceResolution('caputchin/games/leaf-memory', API_HOST, SITE_KEY);
    const calledUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(calledUrl).toBe(
      'https://api.example.com/api/v1/widget/bootstrap?sitekey=cpt_pub_test&game=caputchin%2Fgames%2Fleaf-memory'
    );
  });
});
