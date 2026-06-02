import { defineConfig } from 'tsup';

export default defineConfig({
  // `shim` is a second entry so the server replay host can import the
  // neutralization shim in isolation (and so it can be inlined as a module
  // string into a Worker-Loader isolate) without pulling the whole index.
  // `cli` is the caputchin-selfcheck determinism CLI (bin); its leading
  // shebang is preserved by esbuild so `dist/cli.js` runs directly.
  entry: ['src/index.ts', 'src/shim.ts', 'src/cli.ts'],
  format: ['esm', 'cjs'],
  // The library entries get declarations; `cli` is an executable bin with no
  // public type surface (and its node:* imports need no emitted .d.ts).
  dts: { entry: ['src/index.ts', 'src/shim.ts'] },
  clean: true,
});
