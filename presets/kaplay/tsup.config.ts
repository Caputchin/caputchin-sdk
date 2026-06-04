import { defineConfig } from 'tsup';

// Dual ESM/CJS + .d.ts, mirroring the kits' published shape. `kaplay` and the
// @caputchin/* deps stay external: the consuming game bundles kaplay into its
// own iframe artifact (the preset never vendors the engine), and the contract
// package is resolved at consume time.
export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  target: 'es2020',
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
});
