import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installCustomFetch, armRedeemGate, releaseRedeemGate, registerElement, setActiveSolvingEl } from '../../../src/cap/custom-fetch';

declare global {
  var CAP_CUSTOM_FETCH: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined;
  var __CAPUTCHIN_API_HOST__: string;
}

(globalThis as unknown as { __CAPUTCHIN_API_HOST__: string }).__CAPUTCHIN_API_HOST__ = 'https://api.test.com';

beforeEach(() => {
  installCustomFetch();
});

describe('CAP_CUSTOM_FETCH', () => {
  it('rewrites /challenge URL to /api/v1/verify/start', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}', { headers: { 'content-type': 'application/json' } }));
    await window.CAP_CUSTOM_FETCH!('https://cap.example.com/site_key/challenge', {
      method: 'POST',
      body: JSON.stringify({ challenge: 'x' }),
    });
    expect(fetchSpy).toHaveBeenCalled();
    const calledUrl = fetchSpy.mock.calls[0]![0];
    expect(calledUrl).toBe('https://api.test.com/api/v1/verify/start');
    fetchSpy.mockRestore();
  });

  it('rewrites /redeem URL to /api/v1/verify/pass', async () => {
    const el = document.createElement('div');
    registerElement(el, { platform: {}, onWrappedToken: () => {} });
    setActiveSolvingEl(el);
    armRedeemGate(el);
    releaseRedeemGate(el, {});

    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{"token":"x"}', { headers: { 'content-type': 'application/json' } }));
    await window.CAP_CUSTOM_FETCH!('https://cap.example.com/site_key/redeem', {
      method: 'POST',
      body: JSON.stringify({ token: 'cap' }),
    });
    expect(fetchSpy).toHaveBeenCalled();
    const calledUrl = fetchSpy.mock.calls[0]![0];
    expect(calledUrl).toBe('https://api.test.com/api/v1/verify/pass');
    fetchSpy.mockRestore();
    setActiveSolvingEl(null);
  });

  it('passes through non-Cap URLs unchanged', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}'));
    await window.CAP_CUSTOM_FETCH!('https://example.com/other', { method: 'GET' });
    expect(fetchSpy.mock.calls[0]![0]).toBe('https://example.com/other');
    fetchSpy.mockRestore();
  });
});
