#!/bin/bash
# Build the single wasm. ONE clean wasm32-unknown-unknown cdylib carries both
# C-ABIs (cap_* replay + live_* browser); it is delivered two ways:
#   - dist/{{project-name}}.wasm        : run.modules (the replay isolate loads it precompiled)
#   - src/generated/live-wasm.ts        : gzip+base64 inline for the live IIFE (the iframe CSP forbids fetch)
#
# Requires: rustup + the wasm32-unknown-unknown target. wasm-opt (binaryen) shrinks
# the artifact when present; override with WASM_OPT=/path/to/wasm-opt.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck disable=SC1090
source "$HOME/.cargo/env" 2>/dev/null || true

WASMOPT="${WASM_OPT:-wasm-opt}"
T=wasm32-unknown-unknown
mkdir -p dist src/generated build

echo "[{{project-name}}] cargo build (release)..."
cargo build --release --target "$T"
RAW="target/$T/release/{{crate_name}}.wasm"

OUT="build/{{crate_name}}.wasm"
if command -v "$WASMOPT" >/dev/null 2>&1; then
  "$WASMOPT" -Oz "$RAW" -o "$OUT"
else
  echo "[{{project-name}}] wasm-opt not found; shipping unoptimized wasm"
  cp "$RAW" "$OUT"
fi

cp "$OUT" "dist/{{project-name}}.wasm"
printf 'export default "%s";\n' "$(gzip -9 -n -c "$OUT" | base64 -w0)" > src/generated/live-wasm.ts
echo "[{{project-name}}] wasm $(du -h "$OUT" | cut -f1) -> dist + inlined live-wasm.ts"
