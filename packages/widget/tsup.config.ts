import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { widget: 'src/index.ts' },
  format: ['esm', 'iife'],
  globalName: 'Caputchin',
  dts: true,
  target: 'es2020',
  minify: false,
  clean: true,
});
