import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchBootstrap, buildBootstrapUrl, validateBootstrapResponse } from '../../../src/bootstrap/client.js';

describe('buildBootstrapUrl', () => {
  it('includes sitekey as required + skips absent optional params', () => {
    const url = buildBootstrapUrl({ apiHost: 'https://api.test', sitekey: 'cpt_pub_abc' });
    expect(url).toBe('https://api.test/api/v1/widget/bootstrap?sitekey=cpt_pub_abc');
  });

  it('includes game when provided', () => {
    const url = buildBootstrapUrl({ apiHost: 'https://api.test', sitekey: 'k', game: 'owner/repo' });
    expect(url).toContain('sitekey=k');
    expect(url).toContain('game=owner%2Frepo');
  });

  it('threads all hint params when provided', () => {
    const url = buildBootstrapUrl({
      apiHost: 'https://api.test',
      sitekey: 'k',
      localeIso: 'en',
      localePreset: 'en-us',
      skinTheme: 'dark',
      skinPreset: 'midnight',
      configPreset: 'custom',
    });
    expect(url).toContain('locale_iso=en');
    expect(url).toContain('locale_preset=en-us');
    expect(url).toContain('skin_theme=dark');
    expect(url).toContain('skin_preset=midnight');
    expect(url).toContain('config_preset=custom');
  });

  it('omits empty / null hint values from the query string', () => {
    const url = buildBootstrapUrl({
      apiHost: 'https://api.test',
      sitekey: 'k',
      localeIso: null,
      localePreset: undefined,
      skinTheme: '',
    });
    expect(url).not.toContain('locale_iso');
    expect(url).not.toContain('locale_preset');
    expect(url).not.toContain('skin_theme');
  });
});

describe('validateBootstrapResponse', () => {
  it('returns null when response is not an object', () => {
    expect(validateBootstrapResponse(null)).toBeNull();
    expect(validateBootstrapResponse('hello')).toBeNull();
    expect(validateBootstrapResponse(42)).toBeNull();
  });

  it('returns null when widget block is non-null non-object', () => {
    expect(validateBootstrapResponse({ widget: 'bogus', game: null })).toBeNull();
  });

  it('returns null when game block is non-null non-object', () => {
    expect(validateBootstrapResponse({ widget: null, game: 42 })).toBeNull();
  });

  it('accepts the empty-overrides shape', () => {
    const raw = { widget: { overrides: { locale: null, skin: null, configuration: null } }, game: null };
    expect(validateBootstrapResponse(raw)).toEqual(raw);
  });

  it('accepts both blocks null', () => {
    expect(validateBootstrapResponse({ widget: null, game: null })).toEqual({ widget: null, game: null });
  });

  it('accepts game block with url+integrity', () => {
    const raw = {
      widget: null,
      game: { url: 'https://cdn/x.js', integrity: 'sha384-abc', overrides: null },
    };
    expect(validateBootstrapResponse(raw)).toEqual(raw);
  });

  it('coerces missing widget/game keys to null (defensive)', () => {
    expect(validateBootstrapResponse({})).toEqual({ widget: null, game: null });
  });
});

describe('fetchBootstrap', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed response on 200 OK', async () => {
    const body = { widget: { overrides: { locale: null, skin: null, configuration: null } }, game: null };
    fetchSpy.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    const out = await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k' });
    expect(out).toEqual(body);
  });

  it('returns null on non-2xx response', async () => {
    fetchSpy.mockResolvedValue(new Response('boom', { status: 500 }));
    const out = await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k' });
    expect(out).toBeNull();
  });

  it('returns null on network error', async () => {
    fetchSpy.mockRejectedValue(new TypeError('network'));
    const out = await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k' });
    expect(out).toBeNull();
  });

  it('returns null on invalid JSON body', async () => {
    fetchSpy.mockResolvedValue(new Response('not-json', { status: 200 }));
    const out = await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k' });
    expect(out).toBeNull();
  });

  it('returns null on malformed top-level shape', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ widget: 'bogus', game: null }), { status: 200 }));
    const out = await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k' });
    expect(out).toBeNull();
  });

  it('passes AbortSignal.timeout to fetch (caller cannot extend the window)', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k', timeoutMs: 1000 });
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});
