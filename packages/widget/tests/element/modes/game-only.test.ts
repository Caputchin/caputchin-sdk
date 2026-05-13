import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import * as capClientMod from '../../../src/cap/client.js';
import * as channelMod from '../../../src/protocol/channel.js';
import { installCustomFetch } from '../../../src/cap/custom-fetch.js';
import { getTestElement } from '../../fixtures/test-element.js';

(globalThis as Record<string, unknown>)['__CAPUTCHIN_API_HOST__'] = 'https://api.test.com';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME__'] = '';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME_SHA256__'] = '';

beforeAll(() => {
  installCustomFetch();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response('/* noop */', {
        status: 200,
        headers: { 'content-type': 'application/javascript' },
      }),
    ),
  );
  // happy-dom processes the iframe srcdoc asynchronously and tries to load
  // `<script src="https://x.com/g.js">`. The fetcher is internal to happy-dom
  // and does not always honour the global fetch stub, so the load can throw
  // a SyntaxError on a non-JS response body. Those rejections are unrelated
  // to game-only behaviour — swallow them so they don't fail the run.
  process.on('unhandledRejection', () => {});
});

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

describe('game-only mode', () => {
  it('does not expose start / pass / setNickname on element', () => {
    const el = getTestElement({ sitekey: 'k', mode: 'game-only', 'game-src': 'https://x.com/g.js' });
    document.body.appendChild(el);

    expect((el as Record<string, unknown>)['start']).toBeUndefined();
    expect((el as Record<string, unknown>)['pass']).toBeUndefined();
    expect((el as Record<string, unknown>)['setNickname']).toBeUndefined();

    el.remove();
  });

  it('auto-mounts an iframe when game-src is set', async () => {
    const el = getTestElement({ sitekey: 'k', mode: 'game-only', 'game-src': 'https://x.com/g.js' });
    document.body.appendChild(el);
    await flush();

    expect(el.querySelector('iframe')).not.toBeNull();

    el.remove();
  });

  it('console.warns and stays inert when no game configured', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errors: CustomEvent[] = [];

    const el = getTestElement({ sitekey: 'k', mode: 'game-only' });
    el.addEventListener('error', (e) => errors.push(e as CustomEvent));
    document.body.appendChild(el);
    await flush();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('no game configured'));
    expect(el.querySelector('iframe')).toBeNull();
    expect(errors).toHaveLength(0);

    warnSpy.mockRestore();
    el.remove();
  });

  it('does not inject a hidden token input even when inside a form', async () => {
    const form = document.createElement('form');
    const el = getTestElement({ sitekey: 'k', mode: 'game-only', 'game-src': 'https://x.com/g.js' });
    form.appendChild(el);
    document.body.appendChild(form);
    await flush();

    expect(form.querySelector('input[name="caputchin-token"]')).toBeNull();

    el.remove();
    form.remove();
  });

  it('does not intercept enclosing form submit', async () => {
    const form = document.createElement('form');
    const el = getTestElement({ sitekey: 'k', mode: 'game-only', 'game-src': 'https://x.com/g.js' });
    form.appendChild(el);
    document.body.appendChild(form);
    await flush();

    const event = new SubmitEvent('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);

    el.remove();
    form.remove();
  });

  it('disposes iframe on disconnect', async () => {
    const el = getTestElement({ sitekey: 'k', mode: 'game-only', 'game-src': 'https://x.com/g.js' });
    document.body.appendChild(el);
    await flush();
    expect(el.querySelector('iframe')).not.toBeNull();

    el.remove();
    expect(el.querySelector('iframe')).toBeNull();
  });
});

describe('game-only mode: sitekey-absent coercion', () => {
  it('coerces explicit mode="auto" to game-only with console.warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errors: CustomEvent[] = [];

    const el = getTestElement({ mode: 'auto', 'game-src': 'https://x.com/g.js' });
    el.addEventListener('error', (e) => errors.push(e as CustomEvent));
    document.body.appendChild(el);
    await flush();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('coercing mode="auto" to "game-only"'));
    expect(errors).toHaveLength(0);
    expect(el.querySelector('iframe')).not.toBeNull();

    warnSpy.mockRestore();
    el.remove();
  });

  it('coerces explicit mode="form-submit" to game-only with console.warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errors: CustomEvent[] = [];

    const form = document.createElement('form');
    const el = getTestElement({ mode: 'form-submit', 'game-src': 'https://x.com/g.js' });
    el.addEventListener('error', (e) => errors.push(e as CustomEvent));
    form.appendChild(el);
    document.body.appendChild(form);
    await flush();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('coercing mode="form-submit" to "game-only"'));
    expect(errors).toHaveLength(0);

    warnSpy.mockRestore();
    el.remove();
    form.remove();
  });

  it('coerces explicit mode="manual" to game-only with console.warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const el = getTestElement({ mode: 'manual' });
    document.body.appendChild(el);
    await flush();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('coercing mode="manual" to "game-only"'));
    expect((el as Record<string, unknown>)['start']).toBeUndefined();

    warnSpy.mockRestore();
    el.remove();
  });

  it('does not warn about coercion when sitekey is absent and mode is unset', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errors: CustomEvent[] = [];

    const el = getTestElement({ 'game-src': 'https://x.com/g.js' });
    el.addEventListener('error', (e) => errors.push(e as CustomEvent));
    document.body.appendChild(el);
    await flush();

    const coercionCalls = warnSpy.mock.calls.filter((args) =>
      typeof args[0] === 'string' && args[0].includes('coercing'),
    );
    expect(coercionCalls).toHaveLength(0);
    expect(errors).toHaveLength(0);
    expect(el.querySelector('iframe')).not.toBeNull();

    warnSpy.mockRestore();
    el.remove();
  });

  it('does not warn about coercion when sitekey is absent and mode="game-only" is explicit', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const el = getTestElement({ mode: 'game-only', 'game-src': 'https://x.com/g.js' });
    document.body.appendChild(el);
    await flush();

    const coercionCalls = warnSpy.mock.calls.filter((args) =>
      typeof args[0] === 'string' && args[0].includes('coercing'),
    );
    expect(coercionCalls).toHaveLength(0);

    warnSpy.mockRestore();
    el.remove();
  });
});

describe('game-only mode: channel-driven behavior', () => {
  let listenSpy: ReturnType<typeof vi.spyOn>;
  let sendSpy: ReturnType<typeof vi.spyOn>;
  let createCapClientSpy: ReturnType<typeof vi.spyOn>;
  let capturedListener: ((msg: unknown) => void) | null = null;

  beforeEach(() => {
    capturedListener = null;
    listenSpy = vi.spyOn(channelMod, 'listen').mockImplementation((_iframe, _el, cb) => {
      capturedListener = cb as (msg: unknown) => void;
      return () => {};
    });
    sendSpy = vi.spyOn(channelMod, 'send').mockImplementation(() => {});
    createCapClientSpy = vi.spyOn(capClientMod, 'createCapClient');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    listenSpy.mockRestore();
    sendSpy.mockRestore();
    createCapClientSpy.mockRestore();
  });

  it('never constructs CapClient', async () => {
    const el = getTestElement({ mode: 'game-only', 'game-src': 'https://x.com/g.js' });
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(0);

    expect(createCapClientSpy).not.toHaveBeenCalled();

    el.remove();
  });

  it('never constructs CapClient in the inert no-game branch', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = getTestElement({ mode: 'game-only' });
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(0);

    expect(createCapClientSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    el.remove();
  });

  it('dispatches pass event with token:null on game-pass postMessage', async () => {
    const passes: CustomEvent[] = [];
    const el = getTestElement({ mode: 'game-only', 'game-src': 'https://x.com/g.js' });
    el.addEventListener('pass', (e) => passes.push(e as CustomEvent));
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(0);

    expect(capturedListener).not.toBeNull();
    capturedListener!({ kind: 'game-pass', seq: 1, score: 42, durationMs: 1000 });

    expect(passes).toHaveLength(1);
    expect(passes[0]?.detail).toEqual({ token: null, score: 42, durationMs: 1000 });

    el.remove();
  });

  it('relays game-error postMessage via fireError with originalCode for unknown codes', async () => {
    const errors: CustomEvent[] = [];
    const el = getTestElement({ mode: 'game-only', 'game-src': 'https://x.com/g.js' });
    el.addEventListener('error', (e) => errors.push(e as CustomEvent));
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(0);

    capturedListener!({ kind: 'game-error', seq: 2, code: 'TIMEOUT', message: 'boom' });

    expect(errors).toHaveLength(1);
    expect(errors[0]?.detail.code).toBe('game-error-relayed');
    expect(errors[0]?.detail.originalCode).toBe('TIMEOUT');
    expect(errors[0]?.detail.message).toBe('boom');

    el.remove();
  });

  it('fires iframe-load-failed when kickoff-ack times out after 10s', async () => {
    const errors: CustomEvent[] = [];
    const el = getTestElement({ mode: 'game-only', 'game-src': 'https://x.com/g.js' });
    el.addEventListener('error', (e) => errors.push(e as CustomEvent));
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(0);

    expect(errors).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(10_001);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.detail.code).toBe('iframe-load-failed');

    el.remove();
  });
});

describe('game-only mode: marketplace path', () => {
  // Resolver mock returns empty url so the iframe builder skips the <script src>
  // tag — happy-dom's sync resource loader otherwise tries a real DNS lookup
  // for the URL we return here.
  const emptyResolveOk = (): Response =>
    new Response(JSON.stringify({ url: '', integrity: '' }), { status: 200 });

  it('mounts iframe after marketplace resolve succeeds', async () => {
    const fetchSpy = vi.fn(async () => emptyResolveOk());
    vi.stubGlobal('fetch', fetchSpy);

    const el = getTestElement({ mode: 'game-only', game: '@org/g' });
    document.body.appendChild(el);

    await vi.waitFor(() => {
      expect(el.querySelector('iframe')).not.toBeNull();
    });

    const resolveCalled = fetchSpy.mock.calls.some((c) =>
      String(c[0]).includes('/api/v1/games/'),
    );
    expect(resolveCalled).toBe(true);

    el.remove();
    vi.unstubAllGlobals();
  });

  it('fires resolve-failed error event when marketplace returns non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));

    const errors: CustomEvent[] = [];
    const el = getTestElement({ mode: 'game-only', game: '@org/g' });
    el.addEventListener('error', (e) => errors.push(e as CustomEvent));
    document.body.appendChild(el);

    await vi.waitFor(() => expect(errors.length).toBeGreaterThan(0));

    expect(errors[0]?.detail.code).toBe('resolve-failed');
    expect(el.querySelector('iframe')).toBeNull();

    el.remove();
    vi.unstubAllGlobals();
  });

  it('does not fetch any Cap or /game/* endpoints across full mount + teardown', async () => {
    const fetchSpy = vi.fn(async () => emptyResolveOk());
    vi.stubGlobal('fetch', fetchSpy);

    const el = getTestElement({ mode: 'game-only', game: '@org/g' });
    document.body.appendChild(el);

    await vi.waitFor(() => expect(el.querySelector('iframe')).not.toBeNull());

    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/cap/'))).toBe(false);
    expect(urls.some((u) => u.includes('/game/start'))).toBe(false);
    expect(urls.some((u) => u.includes('/game/pass'))).toBe(false);

    el.remove();
    vi.unstubAllGlobals();
  });
});
