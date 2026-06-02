#!/bin/bash
# Build the headless replay WASM (the default build: the caputchin-replay-rs
# C-ABI, bevy_ecs-free, no wasm-bindgen). This is the freestanding module the
# server replays. tsup copies it to dist/{{project-name}}.wasm.
#
# To add the LIVE (render) build, see README.md: write src/live.rs with a
# wasm-bindgen `start(...)` entry, then build with `--features render` and run
# wasm-bindgen on the result.
#
# Requires: rustup + the wasm32-unknown-unknown target. wasm-opt (binaryen) is
# used to shrink the artifact when present; override with WASM_OPT=/path/to/wasm-opt.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck disable=SC1090
source "$HOME/.cargo/env" 2>/dev/null || true

T=wasm32-unknown-unknown
mkdir -p build
echo "[{{project-name}}] headless replay build..."
cargo build --release --target "$T"

WASMOPT="${WASM_OPT:-wasm-opt}"
IN="target/$T/release/{{crate_name}}.wasm"
OUT="build/{{crate_name}}-headless.wasm"
if command -v "$WASMOPT" >/dev/null 2>&1; then
  "$WASMOPT" -Oz "$IN" -o "$OUT"
else
  echo "[{{project-name}}] wasm-opt not found; shipping unoptimized headless wasm"
  cp "$IN" "$OUT"
fi
echo "[{{project-name}}] headless $(du -h "$OUT" | cut -f1)"
