import { defineConfig } from 'tsup';

export default defineConfig({
  // `shim` is a second entry so the server replay host can import the
  // neutralization shim in isolation (and so it can be inlined as a module
  // string into a Worker-Loader isolate) without pulling the whole index.
  entry: ['src/index.ts', 'src/shim.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
});
