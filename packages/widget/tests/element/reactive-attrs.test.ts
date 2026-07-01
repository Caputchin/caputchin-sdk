import { describe, it, expect, afterEach, vi } from 'vitest';
import { getWidget, getGame } from '../fixtures/test-element.js';
import { injectHiddenInput } from '../../src/form.js';

// Runtime attribute reactivity: `skin` / `locale` changes on a LIVE element
// re-resolve via a bootstrap refetch and apply IN PLACE (no remount), preserving
// an already-solved token; a non-reactive attr still warns. Plus `skin="auto"`
// OS-flip tracking and refetch-failure-keeps-current.

(globalThis as Record<string, unknown>)['__CAPUTCHIN_API_HOST__'] = 'https://api.test.com';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME__'] = '';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME_SHA256__'] = '';

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const settle = async (): Promise<void> => { await flush(); await flush(); await flush(); };

/** A resolved bootstrap keyed off the request URL, so a reskin refetch (with the
 *  new `skin=` / `locale=` params) returns the matching theme/strings. */
function themedResponse(url: string): Response {
  const isDark = /[?&]skin=dark/.test(url);
  const isAr = /[?&]locale=ar/.test(url);
  const body = {
    widget: {
      resolved: {
        locale: isAr
          ? { _lang: 'ar', _direction: 'rtl', simpleVerify: 'تحقق', brandName: 'كابوتشين' }
          : { _lang: 'en', _direction: 'ltr' },
        skin: {
          _theme: isDark ? 'dark' : 'light',
          primary: isDark ? '#111111' : '#eeeeee',
          // Interactive idle shield stroke = text_muted; observable recolor.
          text_muted: isDark ? '#555555' : '#aaaaaa',
        },
        config: null,
      },
    },
    game: null,
    requiresGame: false,
  };
  return new Response(JSON.stringify(body), { status: 200 });
}

function themedFetch(): ReturnType<typeof vi.fn> {
  const fn = vi.fn((input: string | URL) => Promise.resolve(themedResponse(String(input))));
  vi.stubGlobal('fetch', fn);
  return fn;
}

const bootstrapCalls = (fn: ReturnType<typeof vi.fn>): number =>
  fn.mock.calls.filter((c) => String(c[0]).includes('/widget/bootstrap')).length;

describe('<caputchin-widget> runtime skin reactivity', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('re-themes in place on a skin change (no remount, no re-challenge)', async () => {
    const fn = themedFetch();
    const el = getWidget({ sitekey: 'k', trigger: 'click', skin: 'light' });
    document.body.appendChild(el);
    await settle();
    expect(el.getAttribute('data-skin-theme')).toBe('light');
    const rootBefore = el.shadowRoot!.querySelector('[part="simple-checkbox"]');
    const before = bootstrapCalls(fn);

    el.setAttribute('skin', 'dark');
    await settle();

    expect(el.getAttribute('data-skin-theme')).toBe('dark');
    expect(el.style.getPropertyValue('--cpt-skin-primary')).toBe('#111111');
    // Same DOM node → in place, not rebuilt (solved state would survive).
    expect(el.shadowRoot!.querySelector('[part="simple-checkbox"]')).toBe(rootBefore);
    // Shield SVG recolored (idle interactive stroke = text_muted).
    expect(el.shadowRoot!.querySelector('[part="simple-shield-box"] path')!.getAttribute('stroke')).toBe('#555555');
    // Exactly one extra bootstrap; never a /verify/start re-challenge.
    expect(bootstrapCalls(fn)).toBe(before + 1);
    expect(fn.mock.calls.some((c) => String(c[0]).includes('/verify/start'))).toBe(false);
    el.remove();
  });

  it('keeps the current theme when the reskin refetch fails (no flash to bundled)', async () => {
    let call = 0;
    const fn = vi.fn((input: string | URL) => {
      call += 1;
      // First call (mount) resolves light; the reskin refetch fails transiently.
      if (call === 1) return Promise.resolve(themedResponse(String(input)));
      return Promise.resolve(new Response('nope', { status: 500 }));
    });
    vi.stubGlobal('fetch', fn);
    const el = getWidget({ sitekey: 'k', trigger: 'click', skin: 'light' });
    document.body.appendChild(el);
    await settle();
    expect(el.getAttribute('data-skin-theme')).toBe('light');

    el.setAttribute('skin', 'dark');
    await settle();
    // Refetch degraded → keep the current theme, do NOT drop to bundled.
    expect(el.getAttribute('data-skin-theme')).toBe('light');
    el.remove();
  });

  it('a skin change DURING the mount window uses the api host and wins (F1 regression)', async () => {
    const urls: string[] = [];
    let call = 0;
    let resolveMount!: (r: Response) => void;
    const fn = vi.fn((input: string | URL) => {
      urls.push(String(input));
      call += 1;
      if (call === 1) return new Promise<Response>((r) => { resolveMount = r; }); // mount fetch: held open
      return Promise.resolve(themedResponse(String(input))); // reskin fetch
    });
    vi.stubGlobal('fetch', fn);
    const el = getWidget({ sitekey: 'k', trigger: 'click', skin: 'light' });
    document.body.appendChild(el); // fires the mount fetch (call 1, pending)
    await flush();

    // Change skin BEFORE the presentation mounts (inside the bootstrap window).
    el.setAttribute('skin', 'dark');
    await flush();
    // Deferred: no stray fetch fires while the presentation is unmounted.
    expect(urls.length).toBe(1);

    // Resolve the mount fetch (light) → completeMount paints light → flush → reskin(dark).
    resolveMount(themedResponse(urls[0]));
    await settle();

    expect(urls.length).toBe(2);
    // The reskin resolved against the real API host, not an empty relative URL.
    expect(urls[1].startsWith('https://api.test.com')).toBe(true);
    // Newest wins: dark, even though the mount fetch (light) resolved last.
    expect(el.getAttribute('data-skin-theme')).toBe('dark');
    el.remove();
  });
});

describe('<caputchin-widget> runtime locale reactivity', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('re-localizes in place and sets THEN removes dir', async () => {
    themedFetch();
    const el = getWidget({ sitekey: 'k', trigger: 'click' });
    document.body.appendChild(el);
    await settle();
    expect(el.getAttribute('dir')).not.toBe('rtl');

    el.setAttribute('locale', 'ar');
    await settle();
    expect(el.getAttribute('dir')).toBe('rtl');
    expect(el.shadowRoot!.textContent ?? '').toContain('تحقق');

    el.setAttribute('locale', 'en');
    await settle();
    expect(el.hasAttribute('dir')).toBe(false);
    el.remove();
  });
});

describe('<caputchin-widget> reactive batching + non-reactive attrs', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('coalesces a skin+locale pair set in one tick into ONE refetch', async () => {
    const fn = themedFetch();
    const el = getWidget({ sitekey: 'k', trigger: 'click', skin: 'light' });
    document.body.appendChild(el);
    await settle();
    const before = bootstrapCalls(fn);

    el.setAttribute('skin', 'dark');
    el.setAttribute('locale', 'ar');
    await settle();

    expect(bootstrapCalls(fn)).toBe(before + 1);
    el.remove();
  });

  it('warns (and ignores) a non-reactive attr change but NOT a skin change', async () => {
    themedFetch();
    const el = getWidget({ sitekey: 'k', trigger: 'click', skin: 'light' });
    document.body.appendChild(el);
    await settle();

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // `trigger` is observed but non-reactive → still warns.
    el.setAttribute('trigger', 'auto');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ignored'));

    warn.mockClear();
    el.setAttribute('skin', 'dark');
    await settle();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    el.remove();
  });
});

describe('<caputchin-widget> solved token survives a skin toggle', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('leaves the light-DOM caputchin-token untouched across a reskin', async () => {
    themedFetch();
    const form = document.createElement('form');
    document.body.appendChild(form);
    const el = getWidget({ sitekey: 'k', trigger: 'form-submit', skin: 'light' });
    form.appendChild(el);
    await settle();
    // Simulate a solved verification: the token is injected into the enclosing
    // light-DOM form (exactly what run-cap does on success).
    injectHiddenInput(form, 'tok-123');

    el.setAttribute('skin', 'dark');
    await settle();

    const input = form.querySelector<HTMLInputElement>('input[name="caputchin-token"]');
    expect(input?.value).toBe('tok-123');
    expect(el.getAttribute('data-skin-theme')).toBe('dark');
    form.remove();
  });
});

describe('<caputchin-widget> skin="auto" OS tracking', () => {
  const realMatchMedia = window.matchMedia;
  afterEach(() => {
    vi.unstubAllGlobals();
    window.matchMedia = realMatchMedia;
  });

  it('re-skins live when the OS color scheme flips (and detaches on disconnect)', async () => {
    const listeners: Array<() => void> = [];
    const mql = {
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: (t: string, cb: () => void) => { if (t === 'change') listeners.push(cb); },
      removeEventListener: (t: string, cb: () => void) => {
        const i = listeners.indexOf(cb);
        if (i >= 0) listeners.splice(i, 1);
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    };
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;
    themedFetch();

    const el = getWidget({ sitekey: 'k', trigger: 'click' }); // no skin attr → auto
    document.body.appendChild(el);
    await settle();
    expect(el.getAttribute('data-skin-theme')).toBe('light');
    expect(listeners.length).toBe(1);

    // OS flips to dark → the listener fires → reskin resolves dark.
    mql.matches = true;
    listeners.forEach((cb) => cb());
    await settle();
    expect(el.getAttribute('data-skin-theme')).toBe('dark');

    el.remove();
    expect(listeners.length).toBe(0); // listener detached on disconnect
  });

  it('installs the OS tracker when skin flips explicit -> auto at runtime (F2)', async () => {
    const listeners: Array<() => void> = [];
    const mql = {
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: (t: string, cb: () => void) => { if (t === 'change') listeners.push(cb); },
      removeEventListener: (t: string, cb: () => void) => {
        const i = listeners.indexOf(cb);
        if (i >= 0) listeners.splice(i, 1);
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    };
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;
    themedFetch();

    const el = getWidget({ sitekey: 'k', trigger: 'click', skin: 'light' }); // explicit
    document.body.appendChild(el);
    await settle();
    expect(listeners.length).toBe(0); // explicit skin → no OS tracker at mount

    el.setAttribute('skin', 'auto');
    await settle();
    expect(listeners.length).toBe(1); // flipped to auto at runtime → tracker installed

    mql.matches = true;
    listeners.forEach((cb) => cb());
    await settle();
    expect(el.getAttribute('data-skin-theme')).toBe('dark');
    el.remove();
  });
});

describe('<caputchin-widget> geometry reactivity (in place)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('resizes in place on width/size change: same node, no refetch, no re-challenge', async () => {
    const fn = themedFetch();
    const el = getWidget({ sitekey: 'k', trigger: 'click', skin: 'light' });
    document.body.appendChild(el);
    await settle();
    const rootBefore = el.shadowRoot!.querySelector('[part="simple-checkbox"]');
    const before = bootstrapCalls(fn);

    el.setAttribute('width', '500');
    el.setAttribute('size', 'compact');
    await settle();

    // Same node (in place, not rebuilt) → any solved state survives.
    expect(el.shadowRoot!.querySelector('[part="simple-checkbox"]')).toBe(rootBefore);
    expect(el.style.width).toBe('500px');
    expect(rootBefore!.getAttribute('data-size')).toBe('compact');
    // Geometry does not feed bootstrap → no refetch, no /verify/start.
    expect(bootstrapCalls(fn)).toBe(before);
    expect(fn.mock.calls.some((c) => String(c[0]).includes('/verify/start'))).toBe(false);
    el.remove();
  });
});

describe('<caputchin-game> geometry reactivity (re-mount)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('re-mounts the game (recreates the frame) on a geometry change', async () => {
    themedFetch();
    const el = getGame({
      sitekey: 'cpt_pub_x',
      'game-src': 'https://example.com/g.js',
      'no-verify': '',
      layout: 'inline',
      skin: 'light',
      width: '300',
    });
    document.body.appendChild(el);
    await settle();
    const frameBefore = el.shadowRoot!.querySelector('[part="game-frame"]');
    expect(frameBefore).not.toBeNull();

    el.setAttribute('width', '500');
    await settle();

    const frameAfter = el.shadowRoot!.querySelector('[part="game-frame"]');
    expect(frameAfter).not.toBeNull();
    // Re-mounted at the new size → a fresh frame node, not the old one.
    expect(frameAfter).not.toBe(frameBefore);
    // Theme is preserved across the re-mount (rebuilt at the remembered axes).
    expect(el.getAttribute('data-skin-theme')).toBe('light');
    el.remove();
  });

  it('preserves the server-picked gated gameId across a geometry re-mount (F1 regression)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      widget: { resolved: { locale: { _lang: 'en', _direction: 'ltr' }, skin: { _theme: 'light', primary: '#2F6640' }, config: null } },
      game: {
        url: 'https://games.test.com/leaf.js', integrity: 'sha384-x',
        runUrl: null, runIntegrity: null, runModules: null, preferred: null,
        resolved: { locale: null, skin: null, config: null },
      },
      requiresGame: true,
      gameId: 'acme/games/leaf',
      ticket: 'enc.sig',
    }), { status: 200 })));
    // Gated key with NO `game` attribute: the SERVER picks the id.
    const el = getGame({ sitekey: 'cpt_pub_x', layout: 'inline', width: '300' });
    document.body.appendChild(el);
    await settle();
    type GameState = { state: { config: { game: string | null }; requiresGame?: boolean } };
    expect((el as unknown as GameState).state.requiresGame).toBe(true);
    expect((el as unknown as GameState).state.config.game).toBe('acme/games/leaf'); // stashed at mount

    el.setAttribute('width', '500'); // geometry change → re-mount
    await settle();

    // The re-mount must KEEP the server-picked id (not drop to null / re-pick
    // from `games`), or the gated round would fail closed.
    expect((el as unknown as GameState).state.config.game).toBe('acme/games/leaf');
    el.remove();
  });

  it('preserves the gated gameId across a live skin reskin (gated overlay opens later)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      widget: { resolved: { locale: { _lang: 'en', _direction: 'ltr' }, skin: { _theme: 'light', primary: '#2F6640' }, config: null } },
      game: {
        url: 'https://games.test.com/leaf.js', integrity: 'sha384-x',
        runUrl: null, runIntegrity: null, runModules: null, preferred: null,
        resolved: { locale: null, skin: null, config: null },
      },
      requiresGame: true,
      gameId: 'acme/games/leaf',
      ticket: 'enc.sig',
    }), { status: 200 })));
    // Gated modal: the iframe loads on click, so a skin change BEFORE opening must
    // not drop the id (else the later open goes gameless → fails closed).
    const el = getGame({ sitekey: 'cpt_pub_x', layout: 'modal' });
    document.body.appendChild(el);
    await settle();
    type GameState = { state: { config: { game: string | null } } };
    expect((el as unknown as GameState).state.config.game).toBe('acme/games/leaf');

    el.setAttribute('skin', 'dark'); // live reskin re-inspects config
    await settle();

    expect((el as unknown as GameState).state.config.game).toBe('acme/games/leaf');
    el.remove();
  });
});

describe('<caputchin-game> shell skin reactivity', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('re-themes the game shell in place on a skin change', async () => {
    themedFetch();
    const el = getGame({
      sitekey: 'cpt_pub_x',
      'game-src': 'https://example.com/g.js',
      'no-verify': '',
      layout: 'inline',
      skin: 'light',
    });
    document.body.appendChild(el);
    await settle();
    expect(el.getAttribute('data-skin-theme')).toBe('light');

    el.setAttribute('skin', 'dark');
    await settle();
    expect(el.getAttribute('data-skin-theme')).toBe('dark');
    expect(el.style.getPropertyValue('--cpt-skin-primary')).toBe('#111111');
    el.remove();
  });
});
