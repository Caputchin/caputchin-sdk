# Function: decodeTrace()

> **decodeTrace**(`trace`): readonly [`RecordedEvent`](TypeAlias.RecordedEvent.md)[]

Decode the wire trace. Throws on a malformed blob (the run adapter catches it
 and returns a failing verdict, never a crash). The empty string / empty
 envelope decodes to no events (a valid empty round).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `trace` | `string` \| `Uint8Array`\<`ArrayBufferLike`\> |

## Returns

readonly [`RecordedEvent`](TypeAlias.RecordedEvent.md)[]
