# Function: decodeTrace()

> **decodeTrace**\<`A`\>(`trace`): readonly [`TickInput`](index.Interface.TickInput.md)\<`A`\>[]

Parse a trace produced by [encodeTrace](index.Function.encodeTrace.md) back into recorded inputs.
Throws on a malformed blob - `toRun` catches that and yields a failing verdict
(a garbage trace is a failed round, never a crash). Accepts the trace as a
string or UTF-8 bytes.

## Type Parameters

| Type Parameter |
| ------ |
| `A` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `trace` | `string` \| `Uint8Array`\<`ArrayBufferLike`\> |

## Returns

readonly [`TickInput`](index.Interface.TickInput.md)\<`A`\>[]
