# @caputchin/replay-wasm

Generic **host glue** for a Caputchin headless WASM replay artifact. A game whose
sim compiles to WASM (the strongest determinism path - the same `.wasm` runs in
the browser and on the server) uses this kit to turn the module into the one
conforming `run(seed, config, trace)` the platform replays.

It pairs with the [`caputchin-replay-rs`](../replay-rs) authoring crate (which
emits the `cap_alloc` / `cap_run` C-ABI this kit marshals into) and the
[`@caputchin/replay-contract`](../../packages/replay-contract) types.

## What it provides

- **`runWithModule(module, seed, configInts, trace)`** - instantiate a
  precompiled `WebAssembly.Module`, marshal the seed / config / trace across the
  `cap_alloc` / `cap_run` linear-memory C-ABI, and read back the `Verdict`. A
  game's `run` is typically one line over this.
- **`inflateWasm(...)`** - decode a gzip + base64 INLINE wasm payload. A
  replayable artifact often inlines its `.wasm` (the replay isolate forbids
  runtime byte-compilation and network fetch), and this inflates it for
  instantiation.
- **`toBytes(...)`** - the byte-marshalling helper the above share.
- Re-exports the contract types (`Seed`, `Verdict`, `RunFn`) for one import site.

## Usage

```ts
import { runWithModule } from '@caputchin/replay-wasm';
import type { RunFn } from '@caputchin/replay-contract';
import wasmModule from './sim.wasm'; // precompiled module (loader/build provides it)

export const run: RunFn = (seed, config, trace) =>
  runWithModule(wasmModule, seed, configToInts(config), trace);
```

The WASM module must export the `cap_alloc` / `cap_run` C-ABI (the
`caputchin-replay-rs` crate generates it from a deterministic Rust sim).
