// Ships cap.js's runtime assets inside the widget package.
//
// cap.js loads its proof-of-work wasm and the pako inflate fallback from
// jsDelivr by default. We copy both next to the built widget bundle so they
// load from the same origin the widget code loaded from: the ESM entry points
// cap.js at them via `new URL('./cap_wasm_bg.wasm', import.meta.url)` (the
// consumer's bundler re-emits them same-origin), and the IIFE entries point at
// them via `document.currentScript.src`. No third-party CDN reach, no consumer
// CSP change, no consumer install.
//
// Sourced from the @cap.js/wasm + pako BUILD deps (devDependencies), pinned to
// the versions @cap.js/widget (~0.1.50) requests from jsDelivr. Re-copied on
// every tsup build via the `onSuccess` hook. Fails loudly if a source asset
// can't be resolved (a dep bump that moved the path must not silently ship a
// stale or missing binary).
import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

// [source package subpath, shipped filename next to the widget bundle]
const assets = [
  ['@cap.js/wasm/browser/cap_wasm_bg.wasm', 'cap_wasm_bg.wasm'],
  ['pako/dist/pako_inflate.min.js', 'pako_inflate.min.js'],
];

mkdirSync(dist, { recursive: true });
for (const [spec, name] of assets) {
  copyFileSync(require.resolve(spec), resolve(dist, name));
}
console.log(`[widget] copied ${assets.length} cap.js asset(s) into dist/`);
