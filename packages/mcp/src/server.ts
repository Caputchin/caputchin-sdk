import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiRequest, readManagementConfig, type ManagementApiConfig } from './api.js';
import { TOOLS, type ToolDef } from './tools.js';

function toolHandler(cfg: ManagementApiConfig, def: ToolDef) {
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

export function createServer(env: NodeJS.ProcessEnv = process.env): McpServer {
  const cfg = readManagementConfig(env);

  const server = new McpServer(
    { name: 'caputchin', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  for (const def of TOOLS) {
    server.registerTool(
      def.name,
      { description: def.description, inputSchema: def.inputSchema as never },
      toolHandler(cfg, def) as never,
    );
  }

  return server;
}

export { TOOLS } from './tools.js';
