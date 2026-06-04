import { defineConfig } from 'vitest/config';

// Default environment is `node` so the boot/pump spikes run under ONLY the
// preset's own DOM shim — faithful to the replay isolate, which has no happy-dom.
// Tests that need a real DOM to compare against (the live-vs-headless parity
// check) opt in per-file with `// @vitest-environment happy-dom`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
