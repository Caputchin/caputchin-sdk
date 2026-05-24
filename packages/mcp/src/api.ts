/**
 * Thin MCP JSON-RPC client targeting the platform's `/api/mcp` endpoint.
 *
 * Per ADR-0052 the SDK no longer carries its own tool catalogue; it
 * proxies `tools/list` and `tools/call` to the platform. This module
 * holds the network + JSON-RPC plumbing the proxy needs.
 *
 * Auth: management token (`cpt_pat_*`) via the `CAPUTCHIN_TOKEN` env
 * var. Base URL: `CAPUTCHIN_API_HOST` (default https://caputchin.com).
 * The MCP endpoint is `${CAPUTCHIN_API_HOST}/api/mcp`.
 */
export type ManagementApiConfig = {
  baseUrl: string;
  token: string;
};

/**
 * Resolve the platform host: `CAPUTCHIN_API_HOST` env override, else the public
 * apex. Trailing slashes stripped. Shared by the API client and the offline
 * snippet tools so a staging / self-hosted MCP points everything at one host.
 */
export function resolveApiHost(env: NodeJS.ProcessEnv = process.env): string {
  return (env.CAPUTCHIN_API_HOST ?? 'https://caputchin.com').replace(/\/+$/, '');
}

export function readManagementConfig(env: NodeJS.ProcessEnv = process.env): ManagementApiConfig {
  const baseUrl = resolveApiHost(env);
  const token = env.CAPUTCHIN_TOKEN;
  if (!token) {
    throw new Error('CAPUTCHIN_TOKEN env var is required (management token starting with `cpt_pat_`).');
  }
  return { baseUrl, token };
}

import { createRequire } from 'node:module';
const _pkgRequire = createRequire(import.meta.url);
const _pkg = _pkgRequire('../package.json') as { name: string; version: string };
const MCP_CLIENT_NAME = _pkg.name;
const MCP_CLIENT_VERSION = _pkg.version;

// MCP protocol versions this SDK can speak. Aligned with the platform's
// `MCP_PROTOCOL_VERSION` at `caputchin-platform/apps/web/src/app/api/mcp/route.ts`.
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-03-26'] as const;

type JsonRpcResponse =
  | { jsonrpc: '2.0'; id: string | number | null; result: unknown }
  | { jsonrpc: '2.0'; id: string | number | null; error: { code: number; message: string; data?: unknown } };

let rpcId = 0;
function nextRpcId(): number {
  rpcId += 1;
  return rpcId;
}

/**
 * Low-level POST to `/api/mcp`. The body is a JSON-RPC 2.0 envelope; the
 * response is also JSON-RPC 2.0. Network and HTTP errors throw; JSON-RPC
 * `error` envelopes return as the rejected branch on `Result`.
 */
async function postRpc(cfg: ManagementApiConfig, method: string, params?: Record<string, unknown>): Promise<JsonRpcResponse> {
  const body = { jsonrpc: '2.0', id: nextRpcId(), method, ...(params !== undefined ? { params } : {}) };
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/api/mcp`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${cfg.token}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`MCP network error to ${cfg.baseUrl}/api/mcp: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`MCP HTTP ${res.status} from ${cfg.baseUrl}/api/mcp: ${text || '(empty body)'}`);
  }
  const text = await res.text();
  let parsed: JsonRpcResponse;
  try {
    parsed = JSON.parse(text) as JsonRpcResponse;
  } catch {
    throw new Error(`MCP response was not JSON: ${text.slice(0, 200)}`);
  }
  return parsed;
}

export type RemoteTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

/**
 * Negotiate the MCP protocol with the platform. Throws if the platform
 * advertises a protocolVersion this SDK doesn't recognize.
 */
export async function mcpInitialize(cfg: ManagementApiConfig): Promise<void> {
  const resp = await postRpc(cfg, 'initialize', {
    protocolVersion: SUPPORTED_PROTOCOL_VERSIONS[0],
    capabilities: {},
    clientInfo: { name: MCP_CLIENT_NAME, version: MCP_CLIENT_VERSION },
  });
  if ('error' in resp) {
    throw new Error(`MCP initialize failed: ${resp.error.message}`);
  }
  const result = resp.result as { protocolVersion?: unknown } | undefined;
  const advertised = result?.protocolVersion;
  if (typeof advertised !== 'string') {
    throw new Error('MCP initialize: platform did not advertise a protocolVersion.');
  }
  if (!(SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(advertised)) {
    throw new Error(
      `MCP initialize: platform protocolVersion ${advertised} not supported by this SDK (supports ${SUPPORTED_PROTOCOL_VERSIONS.join(', ')}). Upgrade the SDK or downgrade the platform.`,
    );
  }
}

/**
 * Fetch the platform's tool catalogue. Returns a normalized list ready
 * for direct passthrough into MCP `tools/list` responses.
 */
export async function mcpToolsList(cfg: ManagementApiConfig): Promise<RemoteTool[]> {
  const resp = await postRpc(cfg, 'tools/list');
  if ('error' in resp) {
    throw new Error(`MCP tools/list failed: ${resp.error.message}`);
  }
  const result = resp.result as { tools?: unknown } | undefined;
  if (!result || !Array.isArray(result.tools)) {
    throw new Error('MCP tools/list: platform response missing `tools` array.');
  }
  const tools: RemoteTool[] = [];
  for (const t of result.tools) {
    if (
      t &&
      typeof t === 'object' &&
      typeof (t as { name?: unknown }).name === 'string' &&
      typeof (t as { description?: unknown }).description === 'string' &&
      typeof (t as { inputSchema?: unknown }).inputSchema === 'object' &&
      (t as { inputSchema: unknown }).inputSchema !== null
    ) {
      const row = t as { name: string; description: string; inputSchema: Record<string, unknown> };
      tools.push({ name: row.name, description: row.description, inputSchema: row.inputSchema });
    }
  }
  return tools;
}

export type RemoteToolCallResult = {
  /** `true` when the platform handler returned isError, OR when the HTTP layer surfaced a non-RPC error wrapped to the client. */
  isError: boolean;
  /** MCP-spec content blocks. Already in the shape the SDK can return as-is. */
  content: Array<{ type: 'text'; text: string }>;
};

const REDACT_RE = /(Bearer\s+\S+|cpt_pat_[A-Za-z0-9_-]+)/g;
export function redactTokens(text: string): string {
  return text.replace(REDACT_RE, '[REDACTED]');
}

/**
 * Forward a `tools/call` invocation to the platform. The platform's
 * response shape (`{content, isError?}`) is already MCP-spec; we pass it
 * through. Token strings in the surfaced text are redacted as a defense
 * against accidental log capture.
 */
export async function mcpToolsCall(
  cfg: ManagementApiConfig,
  name: string,
  args: Record<string, unknown>,
): Promise<RemoteToolCallResult> {
  let resp: JsonRpcResponse;
  try {
    resp = await postRpc(cfg, 'tools/call', { name, arguments: args });
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: redactTokens(err instanceof Error ? err.message : String(err)) }],
    };
  }
  if ('error' in resp) {
    return {
      isError: true,
      content: [{ type: 'text', text: redactTokens(`MCP error ${resp.error.code}: ${resp.error.message}`) }],
    };
  }
  const result = resp.result as
    | { content?: Array<{ type: 'text'; text: string }>; isError?: boolean }
    | undefined;
  if (!result || !Array.isArray(result.content)) {
    return {
      isError: true,
      content: [{ type: 'text', text: 'MCP tools/call: platform returned no content array.' }],
    };
  }
  return {
    isError: Boolean(result.isError),
    content: result.content.map((c) => ({ type: 'text' as const, text: redactTokens(c.text) })),
  };
}
