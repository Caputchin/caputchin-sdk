import { defineConfig } from 'tsup';

// Dual ESM/CJS + .d.ts, mirroring the kits' published shape. `excalibur` and the
// @caputchin/* deps stay external: the consuming game bundles excalibur into its
// own iframe artifact (the preset never vendors the engine), and the contract /
// determinism packages are resolved at consume time. Two entries: the main API
// (`index`) and the headless side-effect boot (`install`, imported first by a
// game's run entry).
export default defineConfig({
  entry: { index: 'src/index.ts', install: 'src/install.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  target: 'es2020',
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
});
