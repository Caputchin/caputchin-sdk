import { describe, it, expect, vi, afterEach } from 'vitest';

import { resolveGameUrl } from '../../../src/verify/run-game.js';
import type { GameConfig } from '../../../src/config/game.js';

// resolveGameUrl is the seam where the game-load path either reuses the
// mount-time bootstrap's bundle (single round trip) or falls back to a
// dedicated /widget/bootstrap resolve. These tests pin: reuse only when
// the prefetched bundle's id matches the resolved id (a `games` pool pick
// differs from the mount-time `game`), and identical fail-closed behavior.

const el = (): HTMLElement => document.createElement('div');

function cfg(parts: Partial<GameConfig>): GameConfig {
  return { game: null, games: null, gameSrc: null, sitekey: 'k', ...parts } as unknown as GameConfig;
}

function mockFetch(gameBlock: unknown): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ game: gameBlock }) }) as unknown as Response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('resolveGameUrl - bootstrap-bundle reuse', () => {
  it('reuses the prefetched bundle when its id matches - NO second fetch', async () => {
    const fetchFn = mockFetch({ url: 'https://should-not-be-called', integrity: 'nope' });
    const onError = vi.fn();
    const r = await resolveGameUrl(el(), cfg({ game: 'o/r' }), 'https://api', onError, {
      gameId: 'o/r',
      url: 'https://cdn.test/x.js',
      integrity: 'sha384-x',
    });
    expect(r).toEqual({ url: 'https://cdn.test/x.js', integrity: 'sha384-x', gameId: 'o/r' });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('falls back to a fresh resolve when no bundle was prefetched', async () => {
    const fetchFn = mockFetch({ url: 'https://cdn.test/y.js', integrity: 'sha384-y' });
    const r = await resolveGameUrl(el(), cfg({ game: 'o/r' }), 'https://api', vi.fn(), null);
    expect(r).toEqual({ url: 'https://cdn.test/y.js', integrity: 'sha384-y', gameId: 'o/r' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('falls back to a fresh resolve when a games-pool pick differs from the prefetched id', async () => {
    const fetchFn = mockFetch({ url: 'https://cdn.test/pool.js', integrity: 'sha384-p' });
    // games pool resolves to "a/b"; the mount-time bundle was for "o/r" → mismatch.
    const r = await resolveGameUrl(el(), cfg({ game: 'o/r', games: 'a/b' }), 'https://api', vi.fn(), {
      gameId: 'o/r',
      url: 'https://cdn.test/x.js',
      integrity: 'sha384-x',
    });
    expect(r.gameId).toBe('a/b');
    expect(r.url).toBe('https://cdn.test/pool.js');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('fails closed (no fetch) when the prefetched bundle for this id has no url', async () => {
    const fetchFn = mockFetch({ url: 'https://should-not-be-called', integrity: 'nope' });
    const onError = vi.fn();
    const r = await resolveGameUrl(el(), cfg({ game: 'o/r' }), 'https://api', onError, {
      gameId: 'o/r',
      url: null,
      integrity: null,
    });
    expect(r.url).toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('uses the explicit game-src verbatim - no bundle, no fetch', async () => {
    const fetchFn = mockFetch({ url: 'x', integrity: 'y' });
    const r = await resolveGameUrl(el(), cfg({ gameSrc: 'https://host.test/g.js' }), 'https://api', vi.fn(), null);
    expect(r.url).toBe('https://host.test/g.js');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
