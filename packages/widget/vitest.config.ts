// M6: happy-dom prints AbortError to stderr on teardown when fetch is in-flight; no clean suppression path.
import { defineConfig, type Plugin } from 'vitest/config';
import { readFileSync } from 'node:fs';

// Mirror tsup's `dataurl` loader for SVG imports so tests resolve them the
// same way the production build does (returns a `data:image/svg+xml;base64,…`
// string instead of a URL or empty stub).
function svgDataUri(): Plugin {
  return {
    name: 'svg-dataurl',
    enforce: 'pre',
    load(id) {
      const clean = id.split('?')[0]!;
      if (!clean.endsWith('.svg')) return null;
      const raw = readFileSync(clean, 'utf-8');
      const b64 = Buffer.from(raw, 'utf-8').toString('base64');
      return `export default ${JSON.stringify(`data:image/svg+xml;base64,${b64}`)};`;
    },
  };
}

export default defineConfig({
  plugins: [svgDataUri()],
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/env.d.ts', 'src/iframe/runtime.iife.ts'],
      thresholds: { statements: 82, branches: 80, functions: 88, lines: 82 },
    },
  },
});
