import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bridgeHandler, localHandler } from '../src/server.js';
import { LOCAL_TOOLS } from '../src/local-tools.js';
import { TOOLS } from '../src/tools.js';

describe('bridgeHandler', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  const cfg = { baseUrl: 'https://api.caputchin.com', token: 'cpt_pat_test' };

  beforeEach(() => fetchSpy.mockReset());
  afterEach(() => fetchSpy.mockReset());

  it('returns a content block on 2xx', async () => {
    const checkAuth = TOOLS.find((t) => t.name === 'caputchin_check_auth')!;
    fetchSpy.mockResolvedValueOnce(
      new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
    );
    const handler = bridgeHandler(cfg, checkAuth);
    const res = await handler({});
    expect(res.content).toEqual([{ type: 'text', text: JSON.stringify([], null, 2) }]);
    expect('isError' in res).toBe(false);
  });

  it('marks isError on non-2xx with structured error body', async () => {
    const list = TOOLS.find((t) => t.name === 'caputchin_list_sites')!;
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'invalid-token' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    );
    const handler = bridgeHandler(cfg, list);
    const res = await handler({});
    expect(res).toMatchObject({ isError: true });
    expect(res.content[0]?.text).toContain('HTTP 401');
    expect(res.content[0]?.text).toContain('invalid-token');
  });

  it('forwards body factory output as request body', async () => {
    const create = TOOLS.find((t) => t.name === 'caputchin_create_site')!;
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'site_x' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    );
    const handler = bridgeHandler(cfg, create);
    await handler({ name: 'demo', tier: 'alpha' });
    const init = fetchSpy.mock.calls[0]![1]!;
    const parsed = JSON.parse(init.body as string);
    expect(parsed).toEqual({ name: 'demo', tier: 'alpha' });
  });

  it('omits body for methods without a body factory (DELETE)', async () => {
    const del = TOOLS.find((t) => t.name === 'caputchin_delete_site')!;
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const handler = bridgeHandler(cfg, del);
    await handler({ id: 'site_x' });
    const init = fetchSpy.mock.calls[0]![1]!;
    expect(init.body).toBeUndefined();
    expect(init.method).toBe('DELETE');
  });

  it('uses the tool path factory for the URL', async () => {
    const stats = TOOLS.find((t) => t.name === 'caputchin_site_stats')!;
    fetchSpy.mockResolvedValueOnce(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    );
    const handler = bridgeHandler(cfg, stats);
    await handler({ id: 'site_a' });
    const [url] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('https://api.caputchin.com/api/v1/management/sites/site_a/stats');
  });

  it('redacts Bearer tokens from error text', async () => {
    const list = TOOLS.find((t) => t.name === 'caputchin_list_sites')!;
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'invalid-token', auth: 'Bearer cpt_pat_secret123' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      )
    );
    const handler = bridgeHandler(cfg, list);
    const res = await handler({});
    expect(res).toMatchObject({ isError: true });
    const text = res.content[0]?.text ?? '';
    expect(text).not.toContain('cpt_pat_secret123');
    expect(text).toContain('[REDACTED]');
  });

  it('marks isError on network failure', async () => {
    const list = TOOLS.find((t) => t.name === 'caputchin_list_sites')!;
    fetchSpy.mockRejectedValueOnce(new TypeError('network unreachable'));
    const handler = bridgeHandler(cfg, list);
    const res = await handler({});
    expect(res).toMatchObject({ isError: true });
    const text = res.content[0]?.text ?? '';
    expect(text).toContain('HTTP 0');
    expect(text).toContain('network');
  });
});

describe('localHandler', () => {
  const widget = LOCAL_TOOLS.find((t) => t.name === 'caputchin_widget_snippet')!;
  const siteverify = LOCAL_TOOLS.find((t) => t.name === 'caputchin_siteverify_example')!;

  it('returns the rendered text on a valid call', async () => {
    const handler = localHandler(widget);
    const res = await handler({ sitekey: 'cpt_pub_abc' });
    expect(res.content[0]?.text).toContain('cpt_pub_abc');
    expect('isError' in res).toBe(false);
  });

  it('marks isError when input validation throws', async () => {
    const handler = localHandler(widget);
    const res = await handler({});
    expect(res).toMatchObject({ isError: true });
    expect(res.content[0]?.text).toBeTruthy();
  });

  it('marks isError on non-Error throwables', async () => {
    const bad = {
      name: 'bad',
      description: 'throws a string',
      inputSchema: widget.inputSchema,
      handler: async () => {
        throw 'literal string error';
      },
    };
    const handler = localHandler(bad);
    const res = await handler({});
    expect(res).toMatchObject({ isError: true });
    expect(res.content[0]?.text).toBe('literal string error');
  });

  it('passes args through to the underlying tool handler', async () => {
    const handler = localHandler(siteverify);
    const res = await handler({ language: 'curl' });
    expect(res.content[0]?.text).toContain('curl -sS');
  });
});
