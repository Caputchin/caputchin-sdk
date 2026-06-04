import { defineConfig } from 'tsup';
import { copyFileSync } from 'node:fs';

// This scaffold builds the headless replay artifact (dist/run.js + the wasm). To
// ship a playable game, add your live render and a second IIFE entry whose `entry`
// is the caputchin.json `entry`. The reusable live-driver is `LiveSim` from
// @caputchin/replay-wasm (pair it with your renderer); the Voidshot reference game
// is the worked example.
export default defineConfig({
  entry: { run: 'src/run.ts' },
  format: ['esm'],
  outExtension: () => ({ js: '.js' }),
  splitting: false,
  treeshake: true,
  minify: true,
  noExternal: [/.*/],
  clean: true,
  target: 'es2020',
  esbuildPlugins: [
    {
      name: 'external-wasm',
      setup(build) {
        build.onResolve({ filter: /\.wasm$/ }, (args) => ({ path: args.path, external: true }));
      },
    },
  ],
  async onSuccess() {
    copyFileSync('build/{{crate_name}}.wasm', 'dist/{{project-name}}.wasm');
  },
});
