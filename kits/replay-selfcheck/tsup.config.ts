import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/isolate.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
});
