import { defineConfig } from 'tsup';
import fs from 'node:fs';
import path from 'node:path';

const metaPath = path.resolve('dist/.iframe-runtime-meta.json');

let iframeRuntime = '';
let iframeRuntimeSha256 = '';

if (fs.existsSync(metaPath)) {
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as {
    code: string;
    sha256: string;
  };
  iframeRuntime = meta.code;
  iframeRuntimeSha256 = meta.sha256;
} else {
  throw new Error(
    `[widget] dist/.iframe-runtime-meta.json not found. Run 'node scripts/build-iframe-runtime.mjs' first (or use 'pnpm build' which runs prebuild automatically).`
  );
}

// Default to the prod host (caputchin.com). Local dev overrides via the
// `CAPUTCHIN_API_HOST` env var (see mprocs.yaml widget proc).
const sharedDefine = {
  __CAPUTCHIN_API_HOST__: JSON.stringify(
    process.env.CAPUTCHIN_API_HOST ?? 'https://caputchin.com'
  ),
  __IFRAME_RUNTIME__: JSON.stringify(iframeRuntime),
  __IFRAME_RUNTIME_SHA256__: JSON.stringify(iframeRuntimeSha256),
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
};

// SVG brand assets get inlined as data URIs at build time via esbuild's
// `dataurl` loader. Source files live at src/assets/*.svg; the import gives
// us back a `data:image/svg+xml;base64,…` string the widget shell skin
// injects into the resolved palette. Lets the SVGs stay editable as files
// instead of 30KB strings in caputchin.json.
const sharedLoader = { '.svg': 'dataurl' } as const;

// Two builds:
//   1. ESM single entry (`widget.mjs`) — npm consumers import {CaputchinWidget,
//      CaputchinGame} from '@caputchin/widget'. Tree-shakable.
//   2. IIFE three entries — `widget.js` (cap only), `game.js` (game only),
//      `all.js` (both). jsDelivr / script-tag picks per use case.
export default defineConfig([
  {
    entry: { widget: 'src/index.ts' },
    format: ['esm'],
    dts: true,
    target: 'es2020',
    minify: false,
    clean: true,
    outExtension: () => ({ js: '.mjs' }),
    define: sharedDefine,
    loader: sharedLoader,
    // Copy cap.js's wasm + pako fallback (from the @cap.js/wasm + pako build
    // deps) next to the bundle so the package ships them. The ESM entry points
    // cap.js at them via `new URL('./cap_wasm_bg.wasm', import.meta.url)` (the
    // consumer's bundler re-emits same-origin) and the IIFE entries via
    // document.currentScript.src. esbuild leaves those `new URL` literals
    // untouched, so no loader/external needed. Runs on build + every watch
    // rebuild.
    onSuccess: 'node scripts/copy-cap-assets.mjs',
  },
  {
    entry: {
      widget: 'src/entries/widget.ts',
      game: 'src/entries/game.ts',
      all: 'src/entries/all.ts',
    },
    format: ['iife'],
    globalName: 'Caputchin',
    dts: false,
    target: 'es2020',
    minify: false,
    clean: false,
    outExtension: () => ({ js: '.js' }),
    define: sharedDefine,
    loader: sharedLoader,
  },
]);
