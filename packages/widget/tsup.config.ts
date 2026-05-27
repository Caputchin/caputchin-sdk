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

// Two builds, same basename, each registering both elements:
//   1. ESM single entry (`widget.mjs`) - npm consumers
//      `import '@caputchin/widget'` (registers on import) or
//      `import { CaputchinWidget, CaputchinGame }`.
//   2. IIFE single entry (`widget.js`) - jsDelivr / script-tag consumers drop
//      one <script> tag. Registers both custom elements.
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
    // Bundle @cap.js/widget instead of leaving it an external import. cap.js
    // eagerly warms its wasm at module-init, reading window.CAP_CUSTOM_WASM_URL
    // once. As an EXTERNAL static import it is HOISTED above widget.mjs's body,
    // so it ran before wasm-host-esm could set the override -> cap.js fell back
    // to its jsDelivr default (broken under a strict-CSP consumer). Bundling it
    // makes cap a lazy require (same as the IIFE build, which is already
    // correct), invoked at element mount -- long after the body override runs.
    noExternal: ['@cap.js/widget'],
    // Copy cap.js's wasm + pako (from the @cap.js/wasm + pako build deps) next
    // to the bundle so the package ships them; the entries point cap.js at them
    // same-origin (ESM: new URL(import.meta.url); IIFE: currentScript.src).
    // Runs on build + every watch rebuild.
    onSuccess: 'node scripts/copy-cap-assets.mjs',
  },
  {
    entry: { widget: 'src/entries/widget.ts' },
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
