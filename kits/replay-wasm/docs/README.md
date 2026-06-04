# @caputchin/replay-wasm

## Classes

| Class | Description |
| ------ | ------ |
| [LiveSim](Class.LiveSim.md) | A live play session over a sim wasm built with `caputchin_live!`. Create once, `step` each fixed tick feeding the game's opaque i32 input, `state` each frame to render, `trace` once the round ends, then `free`. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [Verdict](Interface.Verdict.md) | The output of a replay `run`, and the only thing we read from it. `passed` drives the captcha decision; `score` and `durationMs` are carried in the issued token (and a future scoreboard). The shape is OURS; everything else about the run - the engine, the trace, the renderer - is the customer's. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [RunFn](TypeAlias.RunFn.md) | The one mandatory contract. A replayable game ships a JS or WASM module exporting a function of this shape under the name RUN\_EXPORT\_NAME: |
| [Seed](TypeAlias.Seed.md) | The replay seed: the low 128 bits of `SHA-256(sessionId : gameId : roundIndex)`, carried as four unsigned 32-bit words, most-significant word first. |

## Functions

| Function | Description |
| ------ | ------ |
| [inflateWasm](Function.inflateWasm.md) | Decode a gzip+base64-inlined WASM payload back to its exact bytes. |
| [runWithModule](Function.runWithModule.md) | Replay one round over a precompiled headless WASM module that exports the Caputchin C-ABI (`cap_alloc` / `cap_run`, see `caputchin-replay-rs`). |
| [toBytes](Function.toBytes.md) | Decode a trace to bytes; pass it through if it is already bytes. |
