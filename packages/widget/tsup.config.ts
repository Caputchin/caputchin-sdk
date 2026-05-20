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

const sharedDefine = {
  __CAPUTCHIN_API_HOST__: JSON.stringify(
    process.env.CAPUTCHIN_API_HOST ?? 'https://api.caputchin.com'
  ),
  __IFRAME_RUNTIME__: JSON.stringify(iframeRuntime),
  __IFRAME_RUNTIME_SHA256__: JSON.stringify(iframeRuntimeSha256),
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
};

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
  },
]);
