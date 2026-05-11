import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

const localOnly = process.argv.includes('--local-only');
const server = createServer(process.env, { localOnly });
const transport = new StdioServerTransport();
await server.connect(transport);
