import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createServer, LOCAL_TOOLS } from '../src/server.js';

/**
 * Pluck the registered request handler for a given schema out of the
 * low-level Server's internal `_requestHandlers` map. The Server class
 * exposes setRequestHandler but no public reader, so tests reach into
 * the private surface to invoke handlers without a stdio round-trip.
 */
function getHandler(
  server: ReturnType<typeof createServer>,
  schemaMethodLiteral: string,
): (req: unknown, extra?: unknown) => Promise<unknown> {
  const handlers = (server as unknown as { _requestHandlers: Map<string, (req: unknown, extra?: unknown) => Promise<unknown>> })._requestHandlers;
  const handler = handlers.get(schemaMethodLiteral);
  if (!handler) {
    throw new Error(`no handler registered for ${schemaMethodLiteral}`);
  }
  return handler;
}

const LIST_METHOD = ListToolsRequestSchema.shape.method.value;
const CALL_METHOD = CallToolRequestSchema.shape.method.value;

describe('createServer', () => {
  it('throws when CAPUTCHIN_TOKEN is missing in default mode', () => {
    expect(() => createServer({} as NodeJS.ProcessEnv)).toThrow(/CAPUTCHIN_TOKEN/);
  });

  it('starts in local-only mode without a token', () => {
    const server = createServer({} as NodeJS.ProcessEnv, { localOnly: true });
    expect(server).toBeTruthy();
  });

  it('starts in full mode with a token', () => {
    const server = createServer(
      { CAPUTCHIN_TOKEN: 'cpt_pat_test_token_value' } as NodeJS.ProcessEnv,
    );
    expect(server).toBeTruthy();
  });
});

describe('local-only tools/list', () => {
  it('returns only LOCAL_TOOLS when --local-only is set', async () => {
    const server = createServer({} as NodeJS.ProcessEnv, { localOnly: true });
    const list = getHandler(server, LIST_METHOD);
    const res = (await list({ method: LIST_METHOD, params: {} })) as {
      tools: Array<{ name: string }>;
    };
    const names = res.tools.map((t) => t.name);
    for (const local of LOCAL_TOOLS) {
      expect(names).toContain(local.name);
    }
    expect(names).not.toContain('caputchin_list_sites');
  });
});

describe('tools/list merges local + platform-fetched tools', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  beforeEach(() => fetchSpy.mockReset());
  afterEach(() => fetchSpy.mockReset());

  it('combines LOCAL_TOOLS with the platform catalogue on the first list call', async () => {
    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: { protocolVersion: '2025-03-26' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            result: {
              tools: [
                { name: 'caputchin_list_sites', description: 'list sites', inputSchema: { type: 'object' } },
                { name: 'caputchin_ping', description: 'health', inputSchema: { type: 'object' } },
              ],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

    const server = createServer(
      { CAPUTCHIN_TOKEN: 'cpt_pat_test' } as NodeJS.ProcessEnv,
    );
    const list = getHandler(server, LIST_METHOD);
    const res = (await list({ method: LIST_METHOD, params: {} })) as {
      tools: Array<{ name: string }>;
    };
    const names = res.tools.map((t) => t.name);
    for (const local of LOCAL_TOOLS) {
      expect(names).toContain(local.name);
    }
    expect(names).toContain('caputchin_list_sites');
    expect(names).toContain('caputchin_ping');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('caches the remote fetch across subsequent list calls', async () => {
    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: { protocolVersion: '2025-03-26' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            result: {
              tools: [{ name: 'caputchin_list_sites', description: '', inputSchema: { type: 'object' } }],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

    const server = createServer(
      { CAPUTCHIN_TOKEN: 'cpt_pat_test' } as NodeJS.ProcessEnv,
    );
    const list = getHandler(server, LIST_METHOD);
    await list({ method: LIST_METHOD, params: {} });
    await list({ method: LIST_METHOD, params: {} });
    await list({ method: LIST_METHOD, params: {} });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('surfaces caputchin_remote_unavailable when the platform is unreachable', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('connect ECONNREFUSED'));

    const server = createServer(
      { CAPUTCHIN_TOKEN: 'cpt_pat_test' } as NodeJS.ProcessEnv,
    );
    const list = getHandler(server, LIST_METHOD);
    const res = (await list({ method: LIST_METHOD, params: {} })) as {
      tools: Array<{ name: string; description: string }>;
    };
    const names = res.tools.map((t) => t.name);
    for (const local of LOCAL_TOOLS) {
      expect(names).toContain(local.name);
    }
    expect(names).toContain('caputchin_remote_unavailable');
    const unavailable = res.tools.find((t) => t.name === 'caputchin_remote_unavailable');
    expect(unavailable?.description).toMatch(/unreachable/);
  });
});

describe('tools/call routing', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  beforeEach(() => fetchSpy.mockReset());
  afterEach(() => fetchSpy.mockReset());

  it('runs local tools without touching the network', async () => {
    const server = createServer({} as NodeJS.ProcessEnv, { localOnly: true });
    const call = getHandler(server, CALL_METHOD);
    const res = (await call({
      method: CALL_METHOD,
      params: {
        name: 'caputchin_widget_snippet',
        arguments: { sitekey: 'cpt_pub_demo' },
      },
    })) as { content: Array<{ text: string }>; isError?: boolean };
    expect(res.isError).toBeFalsy();
    expect(res.content[0]!.text).toContain('caputchin-widget');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('proxies non-local tool calls to /api/mcp', async () => {
    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-03-26' } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            result: { tools: [{ name: 'caputchin_list_sites', description: '', inputSchema: {} }] },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            result: { content: [{ type: 'text', text: '{"sites":[]}' }] },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

    const server = createServer(
      { CAPUTCHIN_TOKEN: 'cpt_pat_test' } as NodeJS.ProcessEnv,
    );
    const list = getHandler(server, LIST_METHOD);
    await list({ method: LIST_METHOD, params: {} });
    const call = getHandler(server, CALL_METHOD);
    const res = (await call({
      method: CALL_METHOD,
      params: { name: 'caputchin_list_sites', arguments: {} },
    })) as { content: Array<{ text: string }>; isError?: boolean };
    expect(res.isError).toBeFalsy();
    expect(res.content[0]!.text).toBe('{"sites":[]}');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('refuses remote tool calls in --local-only mode with a clear error', async () => {
    const server = createServer({} as NodeJS.ProcessEnv, { localOnly: true });
    const call = getHandler(server, CALL_METHOD);
    const res = (await call({
      method: CALL_METHOD,
      params: { name: 'caputchin_list_sites', arguments: {} },
    })) as { content: Array<{ text: string }>; isError?: boolean };
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toMatch(/--local-only/);
  });
});
