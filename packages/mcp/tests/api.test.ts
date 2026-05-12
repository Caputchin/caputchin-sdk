import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, readManagementConfig } from '../src/api.js';

describe('readManagementConfig', () => {
  it('defaults base URL to https://api.caputchin.com when env is unset', () => {
    const cfg = readManagementConfig({ CAPUTCHIN_TOKEN: 'cpt_pat_test' } as NodeJS.ProcessEnv);
    expect(cfg.baseUrl).toBe('https://api.caputchin.com');
    expect(cfg.token).toBe('cpt_pat_test');
  });

  it('strips trailing slashes from base URL', () => {
    const cfg = readManagementConfig({
      CAPUTCHIN_TOKEN: 'cpt_pat_test',
      CAPUTCHIN_API_HOST: 'https://x.example.com///',
    } as NodeJS.ProcessEnv);
    expect(cfg.baseUrl).toBe('https://x.example.com');
  });

  it('throws when CAPUTCHIN_TOKEN is missing', () => {
    expect(() => readManagementConfig({} as NodeJS.ProcessEnv)).toThrow(/CAPUTCHIN_TOKEN/);
  });
});

describe('apiRequest', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');

  beforeEach(() => {
    fetchSpy.mockReset();
  });

  afterEach(() => {
    fetchSpy.mockReset();
  });

  it('sends Bearer auth + json body on POST', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'site_1' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const cfg = { baseUrl: 'https://api.caputchin.com', token: 'cpt_pat_xyz' };
    const result = await apiRequest<{ id: string }>(cfg, 'POST', '/api/v1/management/sites', {
      name: 'demo',
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('https://api.caputchin.com/api/v1/management/sites');
    const headers = init?.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer cpt_pat_xyz');
    expect(headers['content-type']).toBe('application/json');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ name: 'demo' });
    expect(result).toEqual({ ok: true, status: 201, data: { id: 'site_1' } });
  });

  it('omits body when none supplied', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const cfg = { baseUrl: 'https://x', token: 't' };
    await apiRequest(cfg, 'GET', '/api/v1/management/sites');
    const init = fetchSpy.mock.calls[0]![1];
    expect(init?.body).toBeUndefined();
  });

  it('returns ok:false on non-2xx response with parsed error', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'invalid-token' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const cfg = { baseUrl: 'https://x', token: 't' };
    const result = await apiRequest(cfg, 'GET', '/x');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    if (!result.ok) expect(result.error).toEqual({ error: 'invalid-token' });
  });

  it('falls back to raw text when response is not JSON', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response('plain text body', {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      }),
    );
    const cfg = { baseUrl: 'https://x', token: 't' };
    const result = await apiRequest(cfg, 'GET', '/x');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('plain text body');
  });

  it('treats empty body as null', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const cfg = { baseUrl: 'https://x', token: 't' };
    const result = await apiRequest(cfg, 'DELETE', '/x');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeNull();
  });

  it('returns ok:false with status 0 and network code on fetch throw', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('fetch failed'));
    const cfg = { baseUrl: 'https://x', token: 't' };
    const result = await apiRequest(cfg, 'GET', '/x');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    if (!result.ok) {
      expect(result.error).toMatchObject({ code: 'network' });
      expect((result.error as { message: string }).message).toContain('fetch failed');
    }
  });
});
