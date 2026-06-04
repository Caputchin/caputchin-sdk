import { defineConfig } from 'tsup';

export default defineConfig({
  // `cli` is the caputchin-selfcheck determinism CLI (bin); its leading shebang is
  // preserved by esbuild so `dist/cli.js` runs directly. Sibling @caputchin/*
  // deps stay external (resolved at runtime), so the kit pulls in only what its
  // own code imports.
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm', 'cjs'],
  // The library entry gets declarations; `cli` is an executable bin with no
  // public type surface (and its node:* imports need no emitted .d.ts).
  dts: { entry: ['src/index.ts'] },
  clean: true,
});
