import { defineConfig } from 'tsup';

export default defineConfig({
  // index    - the API surface (defineMelonGame, createMelonDriver, re-exports).
  // install  - the HEADLESS side-effect entry: applies the determinism layer +
  //            headless DOM shim + a seeded Math.random BEFORE melonjs (and the
  //            core-js it bundles) evaluate. The run artifact imports it first.
  // live     - the LIVE side-effect entry: the Math swap only, for browser/server
  //            float parity. The live driver imports it first.
  entry: ['src/index.ts', 'src/install.ts', 'src/live.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  // melonjs is a peer dependency: the consuming game bundles its own pinned
  // copy, so it must stay external to this preset's build.
  external: ['melonjs'],
});
