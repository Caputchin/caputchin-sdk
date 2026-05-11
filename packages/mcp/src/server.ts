import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export const TOOLS = [
  {
    name: 'caputchin_ping',
    description: 'Health check — returns pong.',
  },
] as const;

export function createServer(): McpServer {
  const server = new McpServer(
    { name: 'caputchin', version: '0.0.0' },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    'caputchin_ping',
    {
      description: 'Health check — returns pong.',
      inputSchema: z.object({}),
    },
    async () => ({
      content: [{ type: 'text', text: 'pong' }],
    }),
  );

  return server;
}
