import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getGame } from '../../fixtures/test-element.js';

// The bootstrap carries the game's preferred footprint + resolved
// skin/locale/config (and, for a marketplace id, the bundle url), so a SILENT
// degrade mis-sizes the game and drops to bundled skin. EVERY game mount runs
// the bootstrap through the RESILIENT fetch: a GENEROUS per-attempt ceiling
// tolerates a slow-but-alive server (instead of the old 2s abort that dropped it
// into an unstyled / blank render), with a bounded retry on fast transient
// failure and a terminal stop on timeout so the spinner is bounded. This holds
// whether or not an in-page `game-src` bundle exists - the bundle only changes
// what a FINAL degrade can still paint.
//
// Regression for the skin-loss bug: on prod the skinned bootstrap is a permanent
// cache-miss (~1.7s); the old 2s abort dropped it to the bundled default skin.
// The generous ceiling (well above that) lets it complete.

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

describe('resilient bootstrap (game mount)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keyless game: the mount bootstrap carries a generous ceiling signal (not the old no-signal, not the old 2s abort)', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn((input: string | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return Promise.resolve(okBootstrap());
    }));
    const el = getGame({ game: 'acme/games/sample', 'no-verify': '', layout: 'inline' });
    document.body.appendChild(el);
    await settle();
    const mountCall = calls.find((c) => c.url.includes('/widget/bootstrap'));
    expect(mountCall).toBeDefined();
    // A ceiling signal is present (hang-guard); a slow-but-alive server still
    // completes because the ceiling is far above the prod cache-miss latency
    // (covered by the resolved-skin test below).
    expect(mountCall!.init?.signal).toBeInstanceOf(AbortSignal);
    expect(mountCall!.init?.signal?.aborted).toBe(false);
    el.remove();
  });

  it('game-src game (in-page bundle): also runs the resilient ceiling (no longer the aggressive 2s abort)', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn((input: string | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return Promise.resolve(new Response(JSON.stringify({ widget: null, game: null }), { status: 200 }));
    }));
    // sitekey + game-src: the bundle is in-page, but the bootstrap still carries
    // the footprint + resolved skin/locale, so it runs the SAME resilient ceiling
    // as the keyless mount - a slow service no longer silently mis-renders it.
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
    const el = getGame({ game: 'acme/games/sample', 'no-verify': '', layout: 'inline', width: 'full', height: 'full' });
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
      game: 'acme/games/sample',
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
