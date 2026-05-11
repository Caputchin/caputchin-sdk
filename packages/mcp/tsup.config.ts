import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    banner: {
      js: '#!/usr/bin/env node',
    },
    target: 'node20',
    clean: true,
  },
  {
    entry: { server: 'src/server.ts' },
    format: ['esm'],
    dts: true,
    clean: false,
  },
]);
