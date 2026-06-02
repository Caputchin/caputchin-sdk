import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchBootstrap, fetchBootstrapResilient, buildBootstrapUrl, validateBootstrapResponse } from '../../../src/bootstrap/client.js';

describe('buildBootstrapUrl', () => {
  it('includes only sitekey when no other inputs are provided', () => {
    const url = buildBootstrapUrl({ apiHost: 'https://api.test', sitekey: 'cpt_pub_abc' });
    expect(url).toBe('https://api.test/api/v1/widget/bootstrap?sitekey=cpt_pub_abc');
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

  it('threads the pre-resolved locale + skin when provided', () => {
    const url = buildBootstrapUrl({
      apiHost: 'https://api.test',
      sitekey: 'k',
      locale: 'ar',
      skin: 'dark',
    });
    expect(url).toContain('locale=ar');
    expect(url).toContain('skin=dark');
  });

  it('omits empty / null locale + skin (the server falls back to bundled defaults)', () => {
    const url = buildBootstrapUrl({
      apiHost: 'https://api.test',
      sitekey: 'k',
      locale: null,
      skin: '',
    });
    expect(url).not.toContain('locale=');
    expect(url).not.toContain('skin=');
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

  it('returns kind:ok with the parsed response on 200 OK', async () => {
    const body = { widget: { overrides: { locale: null, skin: null, configuration: null } }, game: null };
    fetchSpy.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    const out = await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k' });
    expect(out).toEqual({ kind: 'ok', response: { ...body, requiresGame: false } });
  });

  it('degrades on a transient 5xx (bundled fallback, no hard error)', async () => {
    fetchSpy.mockResolvedValue(new Response('boom', { status: 500 }));
    const out = await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k' });
    expect(out).toEqual({ kind: 'degrade' });
  });

  it('degrades on network error', async () => {
    fetchSpy.mockRejectedValue(new TypeError('network'));
    const out = await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k' });
    expect(out).toEqual({ kind: 'degrade' });
  });

  it('degrades on invalid JSON body', async () => {
    fetchSpy.mockResolvedValue(new Response('not-json', { status: 200 }));
    const out = await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k' });
    expect(out).toEqual({ kind: 'degrade' });
  });

  it('degrades on malformed top-level shape', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ widget: 'bogus', game: null }), { status: 200 }));
    const out = await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k' });
    expect(out).toEqual({ kind: 'degrade' });
  });

  it('surfaces an authoritative 409 gate-game-not-installed as kind:gate with code + message', async () => {
    const body = { error: 'gate-game-not-installed', message: 'Game "x/y" is not in this site key\'s pool.', game: 'x/y' };
    fetchSpy.mockResolvedValue(new Response(JSON.stringify(body), { status: 409 }));
    const out = await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k', game: 'x/y' });
    expect(out).toEqual({ kind: 'gate', error: { code: 'gate-game-not-installed', message: body.message } });
  });

  it('surfaces a 409 gate-misconfigured as kind:gate (empty message tolerated)', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ error: 'gate-misconfigured' }), { status: 409 }));
    const out = await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k' });
    expect(out).toEqual({ kind: 'gate', error: { code: 'gate-misconfigured', message: '' } });
  });

  it('degrades on a 409 carrying an UNKNOWN error code (not an authoritative gate code)', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ error: 'something-else' }), { status: 409 }));
    const out = await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k' });
    expect(out).toEqual({ kind: 'degrade' });
  });

  it('degrades on a 409 with a non-JSON body', async () => {
    fetchSpy.mockResolvedValue(new Response('nope', { status: 409 }));
    const out = await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k' });
    expect(out).toEqual({ kind: 'degrade' });
  });

  it('passes AbortSignal.timeout to fetch (caller cannot extend the window)', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k', timeoutMs: 1000 });
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('timeoutMs:null sends NO abort signal (the mandatory bootstrap runs to completion)', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    await fetchBootstrap({ apiHost: 'https://api', sitekey: 'k', timeoutMs: null });
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBeUndefined();
  });
});

describe('fetchBootstrapResilient (mandatory bootstrap)', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('runs each attempt with NO abort signal (a slow resolve slow-loads, never aborts)', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ widget: null, game: null }), { status: 200 }));
    await fetchBootstrapResilient({ apiHost: 'https://api', sitekey: null, game: 'o/r' });
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBeUndefined();
  });

  it('retries a transient degrade (network error) then returns ok', async () => {
    fetchSpy
      .mockRejectedValueOnce(new TypeError('network'))
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ widget: null, game: null }), { status: 200 }));
    const out = await fetchBootstrapResilient(
      { apiHost: 'https://api', sitekey: null, game: 'o/r' },
      { backoffMs: 0 },
    );
    expect(out.kind).toBe('ok');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('returns an authoritative gate (409) immediately without retrying', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ error: 'gate-game-not-installed' }), { status: 409 }));
    const out = await fetchBootstrapResilient(
      { apiHost: 'https://api', sitekey: 'k', game: 'o/r' },
      { backoffMs: 0 },
    );
    expect(out.kind).toBe('gate');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('gives up after the attempt budget and returns the last degrade', async () => {
    fetchSpy.mockRejectedValue(new TypeError('network'));
    const out = await fetchBootstrapResilient(
      { apiHost: 'https://api', sitekey: null, game: 'o/r' },
      { attempts: 2, backoffMs: 0 },
    );
    expect(out).toEqual({ kind: 'degrade' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
