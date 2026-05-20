import { createRequire } from 'node:module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  mcpInitialize,
  mcpToolsCall,
  mcpToolsList,
  readManagementConfig,
  redactTokens,
  type ManagementApiConfig,
  type RemoteTool,
} from './api.js';
import { LOCAL_TOOLS, type LocalTool } from './local-tools.js';

const _pkgRequire = createRequire(import.meta.url);
const _pkg = _pkgRequire('../package.json') as { version: string };
const SERVER_VERSION = _pkg.version;

/**
 * Convert a Zod schema to a JSON Schema-shaped object for the MCP wire
 * format. Local tools use Zod for input validation; the wire protocol
 * needs the structural JSON Schema. This is a minimal projection
 * sufficient for the two local tools today; if local-tools grows beyond
 * objects, replace with `zod-to-json-schema`.
 */
function zodToWireSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const shape = (schema as unknown as { _def?: { typeName?: string } })._def;
  if (shape?.typeName === 'ZodObject') {
    const objShape = (schema as unknown as { shape: Record<string, z.ZodTypeAny> }).shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(objShape)) {
      const desc = (value as unknown as { _def?: { description?: string } })._def?.description;
      properties[key] = desc ? { type: 'string', description: desc } : { type: 'string' };
      if (!(value as unknown as { isOptional: () => boolean }).isOptional?.()) {
        required.push(key);
      }
    }
    return { type: 'object', properties, required, additionalProperties: false };
  }
  return { type: 'object' };
}

export type CreateServerOptions = {
  /** When true, omit the remote-catalogue fetch and skip reading `CAPUTCHIN_TOKEN`. Only the local-only tools register. */
  localOnly?: boolean;
};

type CatalogueCache = {
  /** Remote tools fetched from the platform's `/api/mcp`. Populated lazily on first `tools/list`. */
  remote: RemoteTool[] | null;
  /** Whether the lazy fetch has already run (success or failure). */
  fetched: boolean;
  /** Last error surface if the lazy fetch failed; included in `tools/list` responses so clients see why their toolbox is bridge-empty. */
  fetchError: string | null;
};

/**
 * Compose the MCP server.
 *
 * Per ADR-0052, the SDK no longer holds its own tool catalogue. At
 * server creation it captures the env config and registers two
 * top-level handlers (`tools/list`, `tools/call`); both merge:
 *
 *  - Local-only tools (`local-tools.ts`) — offline snippet generators
 *    that need no Caputchin account.
 *  - Remote tools fetched from the platform's `/api/mcp` endpoint —
 *    the canonical management-surface catalogue.
 *
 * The remote fetch is lazy (first `tools/list` call triggers it). If
 * the platform is unreachable the local tools still work; the bridge
 * tools surface as absent with an explanatory message on a no-arg-call
 * to `caputchin_remote_unavailable`.
 */
export function createServer(
  env: NodeJS.ProcessEnv = process.env,
  options: CreateServerOptions = {},
): Server {
  const server = new Server(
    { name: 'caputchin', version: '2.0.0' },
    { capabilities: { tools: {} } },
  );

  const cfg: ManagementApiConfig | null = options.localOnly ? null : readManagementConfig(env);
  const cache: CatalogueCache = { remote: null, fetched: false, fetchError: null };

  async function ensureRemoteCatalogue(): Promise<void> {
    if (cache.fetched || cfg === null) return;
    cache.fetched = true;
    try {
      await mcpInitialize(cfg);
      cache.remote = await mcpToolsList(cfg);
    } catch (err) {
      cache.remote = null;
      cache.fetchError = redactTokens(err instanceof Error ? err.message : String(err));
    }
  }

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    await ensureRemoteCatalogue();
    const tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> = [];
    for (const local of LOCAL_TOOLS) {
      tools.push({
        name: local.name,
        description: local.description,
        inputSchema: zodToWireSchema(local.inputSchema),
      });
    }
    if (cache.remote) {
      for (const remote of cache.remote) {
        tools.push(remote);
      }
    }
    if (cfg !== null && cache.fetchError !== null) {
      tools.push({
        name: 'caputchin_remote_unavailable',
        description: `The Caputchin platform MCP endpoint is unreachable: ${cache.fetchError}. Management tools (sites, troops, tokens, hosted-verification, stats, audit logs) are not available in this session. Local-only tools (widget snippet, siteverify example) still work.`,
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      });
    }
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const name = req.params.name;
    const args = (req.params.arguments ?? {}) as Record<string, unknown>;

    const local = LOCAL_TOOLS.find((t) => t.name === name);
    if (local !== undefined) {
      return runLocalTool(local, args);
    }

    if (cfg === null) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Tool \`${name}\` is not available in --local-only mode. Restart without --local-only and provide CAPUTCHIN_TOKEN to enable remote tools.`,
          },
        ],
      };
    }

    await ensureRemoteCatalogue();
    if (cache.fetchError !== null) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Cannot call remote tool \`${name}\`: ${cache.fetchError}`,
          },
        ],
      };
    }
    const result = await mcpToolsCall(cfg, name, args);
    return result;
  });

  return server;
}

async function runLocalTool(local: LocalTool, args: Record<string, unknown>): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  try {
    const text = await local.handler(args);
    return { content: [{ type: 'text', text }] };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
    };
  }
}

export { LOCAL_TOOLS } from './local-tools.js';
