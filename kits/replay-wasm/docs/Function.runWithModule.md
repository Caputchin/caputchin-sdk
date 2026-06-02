# Function: runWithModule()

> **runWithModule**(`wasmModule`, `seed`, `configInts`, `trace`): [`Verdict`](Interface.Verdict.md)

Replay one round over a precompiled headless WASM module that exports the
Caputchin C-ABI (`cap_alloc` / `cap_run`, see `caputchin-replay-rs`).

The module is freestanding (no imports), so it is instantiated with an empty
import object. `config` is **opaque** to this kit: the caller passes the
already-encoded `i32` array its game uses, and the game's WASM decodes it.
Only ever instantiates a precompiled WebAssembly.Module; it never
compiles bytes, which a replay isolate forbids.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `wasmModule` | `Module` | the precompiled headless module. |
| `seed` | [`Seed`](TypeAlias.Seed.md) | the four-word per-round seed (from `@caputchin/replay-contract`). |
| `configInts` | `Int32Array`\<`ArrayBufferLike`\> \| readonly `number`[] | the game-encoded config as an `i32` array (opaque here). |
| `trace` | `string` \| `Uint8Array`\<`ArrayBufferLike`\> | the recorded input trace, as bytes or a base64 string. |

## Returns

[`Verdict`](Interface.Verdict.md)

the replayed [Verdict](Interface.Verdict.md).
