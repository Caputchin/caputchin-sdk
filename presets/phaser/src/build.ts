import type { Options } from 'tsup';

/** Inputs for {@link definePhaserBuild}. */
export interface PhaserBuildOptions {
  /** Game id slug. Live bundle is emitted as `<gameId>.js`. */
  readonly gameId: string;
  /** Live (render) entry. Defaults to `src/index.ts`. */
  readonly liveEntry?: string;
  /** Headless replay entry. Defaults to `src/run.ts`. */
  readonly runEntry?: string;
}

/**
 * Produce the dual tsup config a Phaser game ships:
 *
 *   - a minified IIFE live bundle (`dist/<gameId>.js`) loaded in the widget iframe,
 *     with phaser and all assets inlined (the iframe CSP forbids runtime fetch);
 *   - a minified ESM headless bundle (`dist/run.js`) the replay isolate imports.
 *
 * Both bundle phaser in (it is the engine, not an external the isolate provides).
 * The run entry must import `@caputchin/preset-phaser/install` first so the shim
 * is in place before phaser evaluates (see the package README).
 *
 * Drop the result into the game's `tsup.config.ts`:
 *
 *   import { defineConfig } from 'tsup';
 *   import { definePhaserBuild } from '@caputchin/preset-phaser/build';
 *   export default defineConfig(definePhaserBuild({ gameId: 'my-game' }));
 */
export function definePhaserBuild(opts: PhaserBuildOptions): Options[] {
  const liveEntry = opts.liveEntry ?? 'src/index.ts';
  const runEntry = opts.runEntry ?? 'src/run.ts';
  return [
    {
      entry: { [opts.gameId]: liveEntry },
      format: ['iife'],
      // The live entry is a side-effect (it calls register()); any exports it has
      // are unused at runtime. Give the IIFE a global name so esbuild does not
      // warn about a missing output.name.
      globalName: `caputchin_${opts.gameId.replace(/[^\w$]/g, '_')}`,
      outExtension: () => ({ js: '.js' }),
      splitting: false,
      treeshake: true,
      minify: true,
      noExternal: [/.*/],
      clean: true,
      target: 'es2020',
      loader: { '.svg': 'dataurl', '.png': 'dataurl' },
    },
    {
      entry: { run: runEntry },
      format: ['esm'],
      outExtension: () => ({ js: '.js' }),
      splitting: false,
      treeshake: true,
      minify: true,
      noExternal: [/.*/],
      clean: false,
      target: 'es2020',
    },
  ];
}
