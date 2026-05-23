import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  installCustomFetch,
  armRedeemGate,
  releaseRedeemGate,
  registerSession,
  unregisterSession,
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
    releaseRedeemGate(id, { score: 0.5, durationMs: 100 });

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
    expect(sentBody.platform.score).toBe(0.5);
    expect(onWrappedToken).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'wrapped-xyz', score: 0.5, durationMs: 100 })
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
