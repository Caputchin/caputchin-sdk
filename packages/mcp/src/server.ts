import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiRequest, readManagementConfig, type ManagementApiConfig } from './api.js';
import { LOCAL_TOOLS, type LocalTool } from './local-tools.js';
import { TOOLS, type ToolDef } from './tools.js';

function bridgeHandler(cfg: ManagementApiConfig, def: ToolDef) {
  return async (args: Record<string, unknown>) => {
    const path = def.call.path(args);
    const body = def.call.body ? def.call.body(args) : undefined;
    const result = await apiRequest<unknown>(cfg, def.call.method, path, body);
    if (result.ok) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }],
      };
    }
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: `HTTP ${result.status}: ${JSON.stringify(result.error)}`,
        },
      ],
    };
  };
}

function localHandler(def: LocalTool) {
  return async (args: Record<string, unknown>) => {
    try {
      const text = await def.handler(args);
      return { content: [{ type: 'text' as const, text }] };
    } catch (err) {
      return {
        isError: true,
        content: [
          { type: 'text' as const, text: err instanceof Error ? err.message : String(err) },
        ],
      };
    }
  };
}

export type CreateServerOptions = {
  /** When true, omit bridge tools and skip reading CAPUTCHIN_TOKEN. */
  localOnly?: boolean;
};

export function createServer(
  env: NodeJS.ProcessEnv = process.env,
  options: CreateServerOptions = {},
): McpServer {
  const server = new McpServer(
    { name: 'caputchin', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  if (!options.localOnly) {
    const cfg = readManagementConfig(env);
    for (const def of TOOLS) {
      server.registerTool(
        def.name,
        { description: def.description, inputSchema: def.inputSchema as never },
        bridgeHandler(cfg, def) as never,
      );
    }
  }

  for (const def of LOCAL_TOOLS) {
    server.registerTool(
      def.name,
      { description: def.description, inputSchema: def.inputSchema as never },
      localHandler(def) as never,
    );
  }

  return server;
}

export { TOOLS } from './tools.js';
export { LOCAL_TOOLS } from './local-tools.js';
