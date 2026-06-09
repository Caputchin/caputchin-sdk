import { defineConfig } from 'vitest/config';

// Default environment is `node` so the boot/pump tests run under ONLY the
// preset's own DOM shim - faithful to the replay isolate, which has no happy-dom.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
