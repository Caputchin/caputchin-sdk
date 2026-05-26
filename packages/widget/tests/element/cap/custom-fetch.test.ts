import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  installCustomFetch,
  armRedeemGate,
  releaseRedeemGate,
  registerSession,
  unregisterSession,
  awaitSeed,
  resolveSeedGate,
} from '../../../src/cap/custom-fetch';

declare global {
  var CAP_CUSTOM_FETCH: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined;
  var __CAPUTCHIN_API_HOST__: string;
}

(globalThis as unknown as { __CAPUTCHIN_API_HOST__: string }).__CAPUTCHIN_API_HOST__ = 'https://api.test.com';

beforeEach(() => {
  installCustomFetch();
});

describe('CAP_CUSTOM_FETCH — URL-routed widget identity', () => {
  it('rewrites /__cpt/{id}/challenge → /api/v1/verify/start', async () => {
    const id = 'cpt_t1';
    registerSession(id, { platform: { sitekey: 'k' }, onWrappedToken: () => {} });
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response('{}', { headers: { 'content-type': 'application/json' } })
    );
    await window.CAP_CUSTOM_FETCH!(`https://api.test.com/__cpt/${id}/challenge`, {
      method: 'POST',
      body: JSON.stringify({ challenge: 'x' }),
    });
    expect(fetchSpy).toHaveBeenCalled();
    expect(fetchSpy.mock.calls[0]![0]).toBe('https://api.test.com/api/v1/verify/start');
    fetchSpy.mockRestore();
    unregisterSession(id);
  });

  it('rewrites /__cpt/{id}/redeem → /api/v1/verify/pass and extracts platform.wrappedToken (not cap token)', async () => {
    const id = 'cpt_t2';
    const onWrappedToken = vi.fn();
    registerSession(id, { platform: {}, onWrappedToken });
    armRedeemGate(id);
    releaseRedeemGate(id, { trace: 'tr-xyz' });

    // Real verify/pass shape: cap's own token spread at the top level PLUS the
    // platform wrapped token at platform.wrappedToken. The widget must inject
    // the wrapped token, never the top-level cap token.
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response('{"token":"cap-raw","platform":{"wrappedToken":"wrapped-xyz"}}', { headers: { 'content-type': 'application/json' } })
    );
    await window.CAP_CUSTOM_FETCH!(`https://api.test.com/__cpt/${id}/redeem`, {
      method: 'POST',
      body: JSON.stringify({ token: 'cap' }),
    });
    expect(fetchSpy).toHaveBeenCalled();
    expect(fetchSpy.mock.calls[0]![0]).toBe('https://api.test.com/api/v1/verify/pass');
    const sentBody = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
    expect(sentBody.platform.trace).toBe('tr-xyz');
    // Pass/fail only — the widget surfaces no score (server-authoritative).
    expect(onWrappedToken).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'wrapped-xyz', score: null, durationMs: null })
    );
    fetchSpy.mockRestore();
    unregisterSession(id);
  });

  it('two widgets routed independently — no cross-talk', async () => {
    const idA = 'cpt_a';
    const idB = 'cpt_b';
    const ctxA = { platform: { sitekey: 'A' }, onWrappedToken: vi.fn() };
    const ctxB = { platform: { sitekey: 'B' }, onWrappedToken: vi.fn() };
    registerSession(idA, ctxA);
    registerSession(idB, ctxB);

    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response('{}', { headers: { 'content-type': 'application/json' } })
    );

    await Promise.all([
      window.CAP_CUSTOM_FETCH!(`https://api.test.com/__cpt/${idA}/challenge`, { method: 'POST', body: '{}' }),
      window.CAP_CUSTOM_FETCH!(`https://api.test.com/__cpt/${idB}/challenge`, { method: 'POST', body: '{}' }),
    ]);

    const bodyA = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
    const bodyB = JSON.parse((fetchSpy.mock.calls[1]![1] as RequestInit).body as string);
    expect(bodyA.platform.sitekey).toBe('A');
    expect(bodyB.platform.sitekey).toBe('B');

    fetchSpy.mockRestore();
    unregisterSession(idA);
    unregisterSession(idB);
  });

  it('passes through non-routed URLs unchanged', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}'));
    await window.CAP_CUSTOM_FETCH!('https://example.com/other', { method: 'GET' });
    expect(fetchSpy.mock.calls[0]![0]).toBe('https://example.com/other');
    fetchSpy.mockRestore();
  });
});

describe('CAP_CUSTOM_FETCH — seed gate', () => {
  it('challenge with a valid 4-number seed resolves awaitSeed to that seed', async () => {
    const id = 'cpt_seed_ok';
    registerSession(id, { platform: { sitekey: 'k' }, onWrappedToken: () => {} });
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response('{"platform":{"sessionId":"s1","seed":[1,2,3,4]}}', { headers: { 'content-type': 'application/json' } })
    );
    await window.CAP_CUSTOM_FETCH!(`https://api.test.com/__cpt/${id}/challenge`, { method: 'POST', body: '{}' });
    await expect(awaitSeed(id)).resolves.toEqual([1, 2, 3, 4]);
    fetchSpy.mockRestore();
    unregisterSession(id);
  });

  it('challenge with a malformed seed (wrong arity) resolves awaitSeed null', async () => {
    const id = 'cpt_seed_bad';
    registerSession(id, { platform: { sitekey: 'k' }, onWrappedToken: () => {} });
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response('{"platform":{"sessionId":"s1","seed":[1,2,3]}}', { headers: { 'content-type': 'application/json' } })
    );
    await window.CAP_CUSTOM_FETCH!(`https://api.test.com/__cpt/${id}/challenge`, { method: 'POST', body: '{}' });
    await expect(awaitSeed(id)).resolves.toBeNull();
    fetchSpy.mockRestore();
    unregisterSession(id);
  });

  it('challenge with an unparseable body resolves awaitSeed null', async () => {
    const id = 'cpt_seed_parsefail';
    registerSession(id, { platform: { sitekey: 'k' }, onWrappedToken: () => {} });
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response('not json', { headers: { 'content-type': 'application/json' } })
    );
    await window.CAP_CUSTOM_FETCH!(`https://api.test.com/__cpt/${id}/challenge`, { method: 'POST', body: '{}' });
    await expect(awaitSeed(id)).resolves.toBeNull();
    fetchSpy.mockRestore();
    unregisterSession(id);
  });

  it('challenge that returns !ok resolves awaitSeed null', async () => {
    const id = 'cpt_seed_notok';
    registerSession(id, { platform: { sitekey: 'k' }, onWrappedToken: () => {} });
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response('{}', { status: 500, headers: { 'content-type': 'application/json' } })
    );
    await window.CAP_CUSTOM_FETCH!(`https://api.test.com/__cpt/${id}/challenge`, { method: 'POST', body: '{}' });
    await expect(awaitSeed(id)).resolves.toBeNull();
    fetchSpy.mockRestore();
    unregisterSession(id);
  });

  it('resolveSeedGate unblocks awaitSeed null with no challenge (solve-failure path)', async () => {
    const id = 'cpt_seed_solvefail';
    registerSession(id, { platform: { sitekey: 'k' }, onWrappedToken: () => {} });
    resolveSeedGate(id);
    await expect(awaitSeed(id)).resolves.toBeNull();
    unregisterSession(id);
  });

  it('seed gate times out to null when no challenge ever fires (internal-hang backstop)', async () => {
    vi.useFakeTimers();
    const id = 'cpt_seed_timeout';
    registerSession(id, { platform: { sitekey: 'k' }, onWrappedToken: () => {} });
    const seedPromise = awaitSeed(id);
    vi.advanceTimersByTime(5 * 60 * 1000);
    await expect(seedPromise).resolves.toBeNull();
    unregisterSession(id);
    vi.useRealTimers();
  });

  it('awaitSeed for an unknown widget id resolves null', async () => {
    await expect(awaitSeed('cpt_never_registered')).resolves.toBeNull();
  });
});
