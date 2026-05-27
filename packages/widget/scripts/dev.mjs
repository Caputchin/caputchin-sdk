// Dev orchestrator: keeps the iframe-runtime IIFE (baked into the widget
// bundle via `define: { __IFRAME_RUNTIME__: ... }`) in sync with src
// during `pnpm dev`.
//
// Background: tsup's `--watch` reads `dist/.iframe-runtime-meta.json` once
// at config-eval time. `src/iframe/runtime.iife.ts` edits do not propagate
// into the widget bundle unless `scripts/build-iframe-runtime.mjs`
// re-runs (the package's `prebuild` step) AND tsup notices the meta JSON
// has changed. Standalone `tsup --watch` skips both steps.
//
// This script:
//   1. Builds the iframe runtime once up-front.
//   2. Watches `src/iframe/**` and re-runs the iframe build on change.
//   3. Spawns `tsup --watch` with `dist/.iframe-runtime-meta.json` as an
//      extra watched path - when the meta JSON is rewritten, tsup
//      reloads the config and re-emits the widget bundle with the fresh
//      runtime string.

import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function run(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { cwd: root, stdio: 'inherit', ...opts });
    p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`${cmd} exited ${code}`))));
  });
}

async function buildIframeRuntime() {
  try {
    await run('node', ['scripts/build-iframe-runtime.mjs']);
  } catch (err) {
    console.error('[widget/dev] iframe runtime build failed:', err.message);
  }
}

await buildIframeRuntime();

let pending = null;
watch(resolve(root, 'src/iframe'), { recursive: true }, (_event, filename) => {
  if (!filename) return;
  clearTimeout(pending);
  // Tiny debounce so a burst of editor saves collapses into one rebuild.
  pending = setTimeout(buildIframeRuntime, 80);
});

// `tsup --watch` with the meta-JSON listed as an extra watched path. When
// build-iframe-runtime.mjs rewrites the JSON, tsup picks it up + the
// widget bundle re-emits with the latest iframe runtime string.
spawn(
  'pnpm',
  ['exec', 'tsup', '--watch', 'src', '--watch', 'dist/.iframe-runtime-meta.json'],
  { cwd: root, stdio: 'inherit' },
);
