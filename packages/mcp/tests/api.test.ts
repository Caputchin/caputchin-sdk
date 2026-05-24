import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mcpInitialize,
  mcpToolsCall,
  mcpToolsList,
  readManagementConfig,
  resolveApiHost,
} from '../src/api.js';

describe('resolveApiHost', () => {
  it('defaults to the public apex when env is unset', () => {
    expect(resolveApiHost({} as NodeJS.ProcessEnv)).toBe('https://caputchin.com');
  });
  it('honors CAPUTCHIN_API_HOST and strips trailing slashes', () => {
    expect(
      resolveApiHost({ CAPUTCHIN_API_HOST: 'https://staging.example.com//' } as NodeJS.ProcessEnv),
    ).toBe('https://staging.example.com');
  });
});

describe('readManagementConfig', () => {
  it('defaults base URL to https://caputchin.com when env is unset', () => {
    const cfg = readManagementConfig({ CAPUTCHIN_TOKEN: 'cpt_pat_test' } as NodeJS.ProcessEnv);
    expect(cfg.baseUrl).toBe('https://caputchin.com');
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

describe('mcpInitialize', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  const cfg = { baseUrl: 'https://caputchin.com', token: 'cpt_pat_xyz' };

  beforeEach(() => fetchSpy.mockReset());
  afterEach(() => fetchSpy.mockReset());

  it('POSTs JSON-RPC initialize to /api/mcp and accepts the supported protocolVersion', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            protocolVersion: '2025-03-26',
            serverInfo: { name: 'caputchin', version: '0.1.0' },
            capabilities: { tools: {} },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    await expect(mcpInitialize(cfg)).resolves.toBeUndefined();
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('https://caputchin.com/api/mcp');
    const headers = init?.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer cpt_pat_xyz');
    const body = JSON.parse(init?.body as string);
    expect(body.method).toBe('initialize');
    expect(body.params.protocolVersion).toBe('2025-03-26');
  });

  it('throws on unsupported platform protocolVersion', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: { protocolVersion: '1999-01-01', capabilities: {} },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    await expect(mcpInitialize(cfg)).rejects.toThrow(/protocolVersion 1999-01-01 not supported/);
  });

  it('throws on JSON-RPC error envelope', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32601, message: 'Method not found' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    await expect(mcpInitialize(cfg)).rejects.toThrow(/Method not found/);
  });

  it('throws on HTTP non-2xx', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('unauthorized', { status: 401 }));
    await expect(mcpInitialize(cfg)).rejects.toThrow(/HTTP 401/);
  });

  it('throws on network failure', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(mcpInitialize(cfg)).rejects.toThrow(/network error/);
  });
});

describe('mcpToolsList', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  const cfg = { baseUrl: 'https://caputchin.com', token: 'cpt_pat_xyz' };

  beforeEach(() => fetchSpy.mockReset());
  afterEach(() => fetchSpy.mockReset());

  it('returns normalized tool array from platform response', async () => {
    fetchSpy.mockResolvedValueOnce(
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
    const tools = await mcpToolsList(cfg);
    expect(tools).toHaveLength(2);
    expect(tools[0]!.name).toBe('caputchin_list_sites');
    expect(tools[1]!.inputSchema).toEqual({ type: 'object' });
  });

  it('silently skips malformed tool entries', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          result: {
            tools: [
              { name: 'caputchin_valid', description: 'ok', inputSchema: { type: 'object' } },
              { name: 'missing_schema', description: 'oops' },
              { description: 'missing_name', inputSchema: {} },
              null,
            ],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const tools = await mcpToolsList(cfg);
    expect(tools).toHaveLength(1);
    expect(tools[0]!.name).toBe('caputchin_valid');
  });
});

describe('mcpToolsCall', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  const cfg = { baseUrl: 'https://caputchin.com', token: 'cpt_pat_xyz' };

  beforeEach(() => fetchSpy.mockReset());
  afterEach(() => fetchSpy.mockReset());

  it('passes through platform success content', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 4,
          result: {
            content: [{ type: 'text', text: '{"sites":[]}' }],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const result = await mcpToolsCall(cfg, 'caputchin_list_sites', {});
    expect(result.isError).toBe(false);
    expect(result.content[0]!.text).toBe('{"sites":[]}');
  });

  it('passes through platform isError + content verbatim', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 5,
          result: {
            isError: true,
            content: [{ type: 'text', text: 'HTTP 404: {"error":"site-not-found"}' }],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const result = await mcpToolsCall(cfg, 'caputchin_get_site', { id: 'site_gone' });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('site-not-found');
  });

  it('redacts bearer + PAT-shaped tokens from the surfaced text', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 6,
          result: {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'leaked Bearer cpt_pat_secret123 and cpt_pat_other_secret in body',
              },
            ],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const result = await mcpToolsCall(cfg, 'caputchin_list_sites', {});
    expect(result.content[0]!.text).not.toContain('cpt_pat_secret123');
    expect(result.content[0]!.text).not.toContain('cpt_pat_other_secret');
    expect(result.content[0]!.text).toContain('[REDACTED]');
  });

  it('wraps a network failure as an isError content block (no throw)', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('fetch failed'));
    const result = await mcpToolsCall(cfg, 'caputchin_list_sites', {});
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('network error');
  });

  it('wraps a JSON-RPC error as an isError content block', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 7,
          error: { code: -32602, message: 'invalid arguments' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const result = await mcpToolsCall(cfg, 'caputchin_create_site', { invalid: true });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('invalid arguments');
  });
});
