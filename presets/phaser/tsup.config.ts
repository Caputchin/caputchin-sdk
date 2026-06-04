import { defineConfig } from 'tsup';

// Three entries:
//   index   - the runtime API (seedFromPlatform, makePhaserRun, bootHeadlessPhaser,
//             applyPhaserShim). NO module-load side effect, so the live (browser)
//             build can import it without stubbing the real DOM.
//   install - the side-effect entry. Importing it applies the headless shim at
//             module load, BEFORE phaser evaluates. The headless run entry imports
//             this FIRST (see README). Kept separate so it is never pulled into a
//             live render bundle.
//   build   - the definePhaserBuild tsup helper for consuming games.
//
// `phaser` stays external: it is a peerDependency the consuming game bundles, not
// something this library ships. `tsup` is external too (build.ts uses it as a
// type-only import).
export default defineConfig({
  entry: ['src/index.ts', 'src/install.ts', 'src/live.ts', 'src/build.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  external: ['phaser', 'tsup'],
});
