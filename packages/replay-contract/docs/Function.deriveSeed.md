# Function: deriveSeed()

> **deriveSeed**(`sessionId`, `gameId`, `roundIndex`): `Promise`\<[`Seed`](TypeAlias.Seed.md)\>

Derive the per-round seed from the session, game, and round index.

Preimage: `${sessionId}:${gameId}:${roundIndex}` (UTF-8). Hash: SHA-256 via
Web Crypto (async - there is no sync SHA-256 in the platform, and rolling our
own would be an audit surface). The seed is the LOW 128 bits of the digest
(its last 16 bytes, the digest being big-endian with byte 0 most significant),
packed big-endian into four u32 words, most-significant word first.

This packing is the canonical wire form. The server re-derives it bit-for-bit
at replay, so any drift here silently breaks every replay; the test pins it
against an independent SHA-256.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `sessionId` | `string` | Server-issued session token. Must be non-empty and must not contain `':'`. |
| `gameId` | `string` | Game identifier slug (e.g. `"dino-runner"`). Must be non-empty and must not contain `':'`. |
| `roundIndex` | `number` | Zero-based round counter for this session. Must be a non-negative integer. |

## Returns

`Promise`\<[`Seed`](TypeAlias.Seed.md)\>
