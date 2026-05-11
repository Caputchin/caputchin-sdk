import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { apiRequest, readManagementConfig } from './api.js';

describe('readManagementConfig', () => {
  it('uses defaults + requires CAPUTCHIN_TOKEN', () => {
    expect(() => readManagementConfig({})).toThrow(/CAPUTCHIN_TOKEN/);
  });

  it('uses CAPUTCHIN_API_URL when set, strips trailing slashes', () => {
    const cfg = readManagementConfig({
      CAPUTCHIN_TOKEN: 'cpt_pat_x',
      CAPUTCHIN_API_URL: 'https://api.example.com/',
    });
    expect(cfg.baseUrl).toBe('https://api.example.com');
    expect(cfg.token).toBe('cpt_pat_x');
  });

  it('defaults to api.caputchin.com when CAPUTCHIN_API_URL unset', () => {
    const cfg = readManagementConfig({ CAPUTCHIN_TOKEN: 'cpt_pat_x' });
    expect(cfg.baseUrl).toBe('https://api.caputchin.com');
  });
});

describe('apiRequest', () => {
  const cfg = { baseUrl: 'https://api.test', token: 'cpt_pat_test' };
  let fetchSpy: MockInstance<typeof globalThis.fetch>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('builds Bearer auth + content-type + url correctly', async () => {
    fetchSpy.mockResolvedValue(new Response('{"ok":1}', { status: 200, headers: { 'content-type': 'application/json' } }));
    await apiRequest(cfg, 'POST', '/api/v1/management/sites', { name: 'x' });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.test/api/v1/management/sites',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer cpt_pat_test',
          'content-type': 'application/json',
        }),
        body: JSON.stringify({ name: 'x' }),
      }),
    );
  });

  it('does not include a body on GET', async () => {
    fetchSpy.mockResolvedValue(new Response('[]', { status: 200 }));
    await apiRequest(cfg, 'GET', '/api/v1/management/sites');
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeUndefined();
  });

  it('returns ok:true on 2xx with JSON', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ sites: [] }), { status: 200 }));
    const r = await apiRequest<{ sites: unknown[] }>(cfg, 'GET', '/x');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.status).toBe(200);
      expect(r.data).toEqual({ sites: [] });
    }
  });

  it('returns ok:false on non-2xx with parsed error body', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: 'missing-bearer' }), { status: 401 }),
    );
    const r = await apiRequest(cfg, 'GET', '/x');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(401);
      expect(r.error).toEqual({ error: 'missing-bearer' });
    }
  });

  it('keeps raw text when response is non-JSON', async () => {
    fetchSpy.mockResolvedValue(new Response('<html>500</html>', { status: 500 }));
    const r = await apiRequest(cfg, 'GET', '/x');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('<html>500</html>');
  });

  it('returns ok:true with null when body is empty', async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 200 }));
    const r = await apiRequest(cfg, 'DELETE', '/x');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeNull();
  });
});
