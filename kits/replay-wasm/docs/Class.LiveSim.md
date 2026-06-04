# Class: LiveSim

A live play session over a sim wasm built with `caputchin_live!`. Create once,
`step` each fixed tick feeding the game's opaque i32 input, `state` each frame
to render, `trace` once the round ends, then `free`.

The state and input layouts are the game's own contract with its sim/renderer;
this kit treats them as opaque i32 words.

## Methods

### free() {#free}

> **free**(): `void`

#### Returns

`void`

***

### state() {#state}

> **state**(): `Int32Array`

The current render-state words. Copied out; valid after the call. (A prior
 step may have grown + detached the buffer, so memory is re-read here.)

#### Returns

`Int32Array`

***

### step() {#step}

> **step**(`input`): `void`

Advance one fixed tick with the game's opaque i32 input words.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `Int32Array`\<`ArrayBufferLike`\> \| readonly `number`[] |

#### Returns

`void`

***

### trace() {#trace}

> **trace**(): `Uint8Array`

The recorded input trace (call at round end); submit it via the game-sdk
 bridge for server replay.

#### Returns

`Uint8Array`

***

### create() {#create}

> `static` **create**(`wasmB64`, `seed`, `configInts`): `Promise`\<`LiveSim`\>

Instantiate the gzip+base64-inlined sim wasm (import-free, so empty imports)
 and start a session. `configInts` is the SAME array the replay side feeds
 `cap_run`, so live and replay run identical params.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `wasmB64` | `string` |
| `seed` | [`Seed`](TypeAlias.Seed.md) |
| `configInts` | `Int32Array`\<`ArrayBufferLike`\> \| readonly `number`[] |

#### Returns

`Promise`\<`LiveSim`\>
