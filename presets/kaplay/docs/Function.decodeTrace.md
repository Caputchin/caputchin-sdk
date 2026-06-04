# Function: decodeTrace()

> **decodeTrace**(`trace`): [`RecordedEvent`](Interface.RecordedEvent.md)[]

Decode a trace produced by [encodeTrace](Function.encodeTrace.md). Throws on a malformed or
wrong-version blob; the caller ([kaplayRun](Function.kaplayRun.md)) turns a throw into a failing
verdict so a garbage trace is a failed round, never a crash. Accepts a string
or UTF-8 bytes.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `trace` | `string` \| `Uint8Array`\<`ArrayBufferLike`\> |

## Returns

[`RecordedEvent`](Interface.RecordedEvent.md)[]
