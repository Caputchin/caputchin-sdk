import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  installCustomFetch,
  armRedeemGate,
  releaseRedeemGate,
  registerElement,
  unregisterElement,
  setActiveSolvingEl,
  type SessionContext,
} from '../../../src/cap/custom-fetch.js';

(globalThis as Record<string, unknown>)['__CAPUTCHIN_API_HOST__'] = 'https://api.test.com';

installCustomFetch();

const capFetch = (): typeof fetch => {
  return (window as Record<string, unknown>)['CAP_CUSTOM_FETCH'] as typeof fetch;
};

const makeFetchSpy = () =>
  vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    new Response(JSON.stringify({ token: 'tok', score: 10, durationMs: 500 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );

describe('CAP_CUSTOM_FETCH', () => {
  let el: HTMLElement;
  let fetchSpy: ReturnType<typeof makeFetchSpy>;

  beforeEach(() => {
    el = document.createElement('div');
    fetchSpy = makeFetchSpy();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    unregisterElement(el);
    setActiveSolvingEl(null);
    vi.restoreAllMocks();
  });

  it('rewrites /challenge URL to /api/v1/game/start', async () => {
    const ctx: SessionContext = { platform: { sitekey: 'k' }, onWrappedToken: vi.fn() };
    registerElement(el, ctx);
    setActiveSolvingEl(el);

    await capFetch()('https://api.cap.dev/challenge', { method: 'POST' });

    expect(fetchSpy.mock.calls[0]![0]).toBe('https://api.test.com/api/v1/game/start');
  });

  it('rewrites /redeem URL to /api/v1/game/complete', async () => {
    const ctx: SessionContext = { platform: { sitekey: 'k' }, onWrappedToken: vi.fn() };
    registerElement(el, ctx);
    setActiveSolvingEl(el);
    armRedeemGate(el);
    releaseRedeemGate(el, { score: 5, durationMs: 100 });

    await capFetch()('https://api.cap.dev/redeem', {
      method: 'POST',
      body: JSON.stringify({ token: 'cap-tok', solutions: [] }),
    });

    expect(fetchSpy.mock.calls[0]![0]).toBe('https://api.test.com/api/v1/game/complete');
  });

  it('injects platform into challenge body', async () => {
    const ctx: SessionContext = { platform: { sitekey: 'cpt_pub_test' }, onWrappedToken: vi.fn() };
    registerElement(el, ctx);
    setActiveSolvingEl(el);

    await capFetch()('https://api.cap.dev/challenge', { method: 'POST' });

    const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
    expect(body.platform.sitekey).toBe('cpt_pub_test');
  });

  it('redeem blocks until gate is released', async () => {
    const ctx: SessionContext = { platform: {}, onWrappedToken: vi.fn() };
    registerElement(el, ctx);
    setActiveSolvingEl(el);
    armRedeemGate(el);

    let resolved = false;
    const promise = capFetch()('https://api.cap.dev/redeem', {
      method: 'POST',
      body: JSON.stringify({ token: 't', solutions: [] }),
    }).then(() => { resolved = true; });

    await Promise.resolve();
    expect(resolved).toBe(false);

    releaseRedeemGate(el, { score: null, durationMs: null });
    await promise;
    expect(resolved).toBe(true);
  });

  it('per-instance gates do not cross-contaminate', async () => {
    const el2 = document.createElement('div');
    const ctx1: SessionContext = { platform: {}, onWrappedToken: vi.fn() };
    const ctx2: SessionContext = { platform: {}, onWrappedToken: vi.fn() };

    registerElement(el, ctx1);
    registerElement(el2, ctx2);
    armRedeemGate(el);
    armRedeemGate(el2);
    setActiveSolvingEl(el);

    let el1Resolved = false;
    capFetch()('https://api.cap.dev/redeem', {
      method: 'POST',
      body: JSON.stringify({ token: 't', solutions: [] }),
    }).then(() => { el1Resolved = true; });

    releaseRedeemGate(el2, {});
    await Promise.resolve();
    expect(el1Resolved).toBe(false);

    releaseRedeemGate(el, {});
    await new Promise((r) => setTimeout(r, 10));
    expect(el1Resolved).toBe(true);

    unregisterElement(el2);
  });

  it('passes non-cap URLs through unchanged', async () => {
    await capFetch()('https://example.com/other', {});
    expect(fetchSpy.mock.calls[0]![0]).toBe('https://example.com/other');
  });

  it('onWrappedToken is called before fetch resolves (synchronous relative to solve)', async () => {
    const onWrappedToken = vi.fn();
    const ctx: SessionContext = { platform: {}, onWrappedToken };
    registerElement(el, ctx);
    setActiveSolvingEl(el);
    armRedeemGate(el);
    releaseRedeemGate(el, {});

    await capFetch()('https://api.cap.dev/redeem', {
      method: 'POST',
      body: JSON.stringify({ token: 'cap-tok', solutions: [] }),
    });

    expect(onWrappedToken).toHaveBeenCalledOnce();
    expect(onWrappedToken.mock.calls[0]![0].token).toBe('tok');
    expect(onWrappedToken.mock.calls[0]![0].score).toBe(10);
    expect(onWrappedToken.mock.calls[0]![0].durationMs).toBe(500);
  });
});
