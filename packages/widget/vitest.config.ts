// M6: happy-dom prints AbortError to stderr on teardown when fetch is in-flight; no clean suppression path.
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
