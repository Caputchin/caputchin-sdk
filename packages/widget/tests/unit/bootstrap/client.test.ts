import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchBootstrap, buildBootstrapUrl, validateBootstrapResponse } from '../../../src/bootstrap/client.js';

describe('buildBootstrapUrl', () => {
  it('includes sitekey + always emits prefers_dark; skips absent optional params', () => {
    const url = buildBootstrapUrl({ apiHost: 'https://api.test', sitekey: 'cpt_pub_abc' });
    expect(url).toBe('https://api.test/api/v1/widget/bootstrap?sitekey=cpt_pub_abc&prefers_dark=false');
  });

  it('includes game when provided', () => {
    const url = buildBootstrapUrl({ apiHost: 'https://api.test', sitekey: 'k', game: 'owner/repo' });
    expect(url).toContain('sitekey=k');
    expect(url).toContain('game=owner%2Frepo');
  });

  it('includes games sub-pool hint when provided', () => {
    const url = buildBootstrapUrl({ apiHost: 'https://api.test', sitekey: 'k', games: 'a,b' });
    expect(url).toContain('games=a%2Cb');
  });

  it('threads the resolution inputs (explicit attrs + visitor signals) when provided', () => {
    const url = buildBootstrapUrl({
      apiHost: 'https://api.test',
      sitekey: 'k',
      locale: 'ar',
      navLang: 'en-US',
      skin: 'dark',
      prefersDark: true,
    });
    expect(url).toContain('locale=ar');
    expect(url).toContain('nav_lang=en-US');
    expect(url).toContain('skin=dark');
    expect(url).toContain('prefers_dark=true');
  });

  it('omits empty / null inputs (but prefers_dark always emits)', () => {
    const url = buildBootstrapUrl({
      apiHost: 'https://api.test',
      sitekey: 'k',
      locale: null,
      navLang: undefined,
      skin: '',
    });
    expect(url).not.toContain('locale=');
    expect(url).not.toContain('nav_lang');
    expect(url).not.toContain('skin=');
    expect(url).toContain('prefers_dark=false');
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
    expect(validateBootstrapResponse(raw)).toEqual({ ...raw, requiresGame: false });
  });

  it('accepts both blocks null', () => {
    expect(validateBootstrapResponse({ widget: null, game: null })).toEqual({ widget: null, game: null, requiresGame: false });
  });

  it('accepts game block with url+integrity', () => {
    const raw = {
      widget: null,
      game: { url: 'https://cdn/x.js', integrity: 'sha384-abc', overrides: null },
    };
    expect(validateBootstrapResponse(raw)).toEqual({ ...raw, requiresGame: false });
  });

  it('coerces missing widget/game keys to null (defensive)', () => {
    expect(validateBootstrapResponse({})).toEqual({ widget: null, game: null, requiresGame: false });
  });

  it('passes through the server gate fields (requiresGame / gameId / ticket)', () => {
    const raw = {
      widget: null,
      game: { url: 'https://cdn/leaf.js', integrity: 'sha384-x', overrides: null },
      requiresGame: true,
      gameId: 'caputchin/games/leaf',
      ticket: 'enc.sig',
    };
    expect(validateBootstrapResponse(raw)).toEqual(raw);
  });

  it('coerces a non-true requiresGame to false + drops non-string gameId/ticket', () => {
    const out = validateBootstrapResponse({ widget: null, game: null, requiresGame: 'yes', gameId: 42, ticket: {} });
    expect(out).toEqual({ widget: null, game: null, requiresGame: false });
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
    expect(out).toEqual({ ...body, requiresGame: false });
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
