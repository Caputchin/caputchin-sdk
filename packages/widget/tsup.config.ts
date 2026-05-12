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

export default defineConfig({
  entry: { widget: 'src/index.ts' },
  format: ['esm', 'iife'],
  globalName: 'Caputchin',
  dts: true,
  target: 'es2020',
  minify: false,
  clean: true,
  outExtension({ format }) {
    if (format === 'esm') return { js: '.mjs' };
    if (format === 'iife') return { js: '.js' };
    return { js: '.js' };
  },
  define: {
    __CAPUTCHIN_API_HOST__: JSON.stringify(
      process.env.CAPUTCHIN_API_HOST ?? 'https://api.caputchin.com'
    ),
    __IFRAME_RUNTIME__: JSON.stringify(iframeRuntime),
    __IFRAME_RUNTIME_SHA256__: JSON.stringify(iframeRuntimeSha256),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
});
