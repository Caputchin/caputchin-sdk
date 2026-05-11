import * as esbuild from 'esbuild';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const result = await esbuild.build({
  entryPoints: [resolve(root, 'src/iframe/runtime.iife.ts')],
  bundle: true,
  format: 'iife',
  globalName: '_CaputchinRuntime',
  target: 'es2020',
  write: false,
  minify: true,
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
});

const code = result.outputFiles[0].text;
const sha256 = createHash('sha256').update(code).digest('base64');

mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(
  resolve(root, 'dist/.iframe-runtime-meta.json'),
  JSON.stringify({ code, sha256 }, null, 0)
);

console.log(`[build-iframe-runtime] sha256=${sha256} length=${code.length}`);
