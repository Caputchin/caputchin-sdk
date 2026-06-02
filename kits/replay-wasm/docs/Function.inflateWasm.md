# Function: inflateWasm()

> **inflateWasm**(`b64`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Decode a gzip+base64-inlined WASM payload back to its exact bytes.

A game's live build inlines its WASM as a string (the game iframe's CSP is
`connect-src 'none'`, so it cannot fetch a `.wasm`) and gzips it to stay under
the marketplace bundle gate. This reverses both: base64 decode, then gunzip.
Uses the native DecompressionStream where available (fast), and falls
back to fflate for runtimes without it.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `b64` | `string` | the gzip-then-base64 payload emitted at build time. |

## Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

the original uncompressed WASM bytes.
