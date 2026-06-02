import { defineConfig } from 'tsup';
import { copyFileSync } from 'node:fs';

// Builds the headless replay entry (dist/run.js) and copies the headless sim
// module to dist/{{project-name}}.wasm. `./{{project-name}}.wasm` stays external
// because the replay isolate supplies it precompiled via the module map.
//
// When you add your live (render) build, add a second IIFE config here that
// bundles src/index.ts with the wasm-bindgen glue inlined (see README.md).
export default defineConfig([
  {
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
      copyFileSync('build/{{crate_name}}-headless.wasm', 'dist/{{project-name}}.wasm');
    },
  },
]);
