import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getGame } from '../../fixtures/test-element.js';

// A bootstrap-sourced game (marketplace id, no in-page `game-src`) has nothing
// to paint without the bootstrap: the resolved skin/locale/config + footprint
// AND the bundle url all ride the response. So its mount bootstrap is MANDATORY
// - it must run to completion (slow-load), never abort at 2s into an unstyled /
// blank render. A `game-src` (in-page bundle) mount keeps the optional 2s abort.
//
// Regression for the keyless skin-loss bug: on prod the skinned bootstrap is a
// permanent cache-miss (~1.7s) and the 2s AbortSignal.timeout aborted it →
// degrade → resolved skin lost → game rendered the bundled default skin.

(globalThis as Record<string, unknown>)['__CAPUTCHIN_API_HOST__'] = 'https://api.test.com';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME__'] = '';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME_SHA256__'] = '';

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const settle = async (): Promise<void> => { await flush(); await flush(); await flush(); };

// A bootstrap response with a DARK resolved widget shell skin + a resolved game
// block, so a successful mount is observable: the host gets data-skin-theme +
// the --cpt-skin-* vars, and the game iframe mounts.
function okBootstrap(): Response {
  const body = {
    widget: { resolved: { locale: null, skin: { _theme: 'dark', primary: '#ABCDEF' }, config: null } },
    game: {
      url: 'https://example.com/game.js',
      integrity: 'sha384-abc',
      runUrl: null,
      runIntegrity: null,
      runModules: null,
      preferred: { width: 320, height: 380, layout: 'inline' },
      resolved: { locale: null, skin: { _theme: 'dark', card_front_bg: '#252D5C' }, config: null },
    },
    requiresGame: false,
  };
  return new Response(JSON.stringify(body), { status: 200 });
}

/** A fetch mock whose response is resolved on demand, to model a SLOW bootstrap
 *  that completes long after the old 2s abort would have fired. */
function deferredFetch(): { spy: ReturnType<typeof vi.fn>; resolve: (r: Response) => void; calls: { url: string; init?: RequestInit }[] } {
  let resolveFn!: (r: Response) => void;
  const pending = new Promise<Response>((r) => { resolveFn = r; });
  const calls: { url: string; init?: RequestInit }[] = [];
  const spy = vi.fn((input: string | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return pending;
  });
  return { spy, resolve: resolveFn!, calls };
}

describe('mandatory bootstrap (bootstrap-sourced game)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keyless game: the mount bootstrap carries NO abort signal', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn((input: string | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return Promise.resolve(okBootstrap());
    }));
    const el = getGame({ game: 'caputchin/games/leaf-memory', 'no-verify': '', layout: 'inline' });
    document.body.appendChild(el);
    await settle();
    const mountCall = calls.find((c) => c.url.includes('/widget/bootstrap'));
    expect(mountCall).toBeDefined();
    expect(mountCall!.init?.signal).toBeUndefined();
    el.remove();
  });

  it('game-src game (in-page bundle): the bootstrap keeps the 2s abort signal', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn((input: string | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return Promise.resolve(new Response(JSON.stringify({ widget: null, game: null }), { status: 200 }));
    }));
    // sitekey + game-src: bootstrap runs (for overrides) but the bundle is in
    // page, so it is the OPTIONAL path that degrades at 2s.
    const el = getGame({ sitekey: 'cpt_pub_x', 'game-src': 'https://example.com/g.js', 'no-verify': '', layout: 'inline' });
    document.body.appendChild(el);
    await settle();
    const mountCall = calls.find((c) => c.url.includes('/widget/bootstrap'));
    expect(mountCall).toBeDefined();
    expect(mountCall!.init?.signal).toBeInstanceOf(AbortSignal);
    el.remove();
  });

  it('shows a loading skeleton during the wait and removes it once mounted', async () => {
    const { spy, resolve } = deferredFetch();
    vi.stubGlobal('fetch', spy);
    const el = getGame({ game: 'caputchin/games/leaf-memory', 'no-verify': '', layout: 'inline', width: 'full', height: 'full' });
    document.body.appendChild(el);
    await flush();
    // Bootstrap still pending: skeleton up, no game iframe.
    expect(el.shadowRoot?.querySelector('[part="loading"]')).not.toBeNull();
    expect(el.shadowRoot?.querySelector('iframe')).toBeNull();

    resolve(okBootstrap());
    await settle();
    // Resolved: skeleton gone, game iframe mounted.
    expect(el.shadowRoot?.querySelector('[part="loading"]')).toBeNull();
    expect(el.shadowRoot?.querySelector('iframe')).not.toBeNull();
    el.remove();
  });

  it('manual mode shows NO skeleton during the wait (the customer slots their own DOM)', async () => {
    const { spy } = deferredFetch();
    vi.stubGlobal('fetch', spy);
    // Manual + sitekey: the bootstrap still runs (shell overrides), but the box
    // is owned by the customer's slotted DOM, so no skeleton is painted over it.
    const el = getGame({ sitekey: 'cpt_pub_x', trigger: 'manual', 'no-verify': '', layout: 'inline' });
    document.body.appendChild(el);
    await flush();
    expect(el.shadowRoot?.querySelector('[part="loading"]')).toBeNull();
    el.remove();
  });

  it('a slow bootstrap still applies the resolved skin (never the bundled default)', async () => {
    const { spy, resolve } = deferredFetch();
    vi.stubGlobal('fetch', spy);
    const el = getGame({
      game: 'caputchin/games/leaf-memory',
      'no-verify': '',
      layout: 'inline',
      skin: JSON.stringify({ _theme: 'dark', card_front_bg: '#252D5C' }),
    });
    document.body.appendChild(el);
    await flush();
    // Not resolved yet → completeMount has not run → no resolved theme on host.
    expect(el.getAttribute('data-skin-theme')).toBeNull();

    resolve(okBootstrap());
    await settle();
    // The resolved DARK shell skin survived the slow bootstrap.
    expect(el.getAttribute('data-skin-theme')).toBe('dark');
    expect(el.style.getPropertyValue('--cpt-skin-primary')).toBe('#ABCDEF');
    expect(el.shadowRoot?.querySelector('iframe')).not.toBeNull();
    el.remove();
  });
});
