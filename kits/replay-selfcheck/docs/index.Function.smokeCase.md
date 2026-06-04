# Function: smokeCase()

> **smokeCase**(`emptyTrace?`): [`SelfCheckCase`](index.Interface.SelfCheckCase.md)

The mandatory smoke case: seed `[0,0,0,0]` over an empty trace. A conforming
run must return a parseable `Verdict` here (a garbage/empty trace is a FAILED
round, never a crash). Both the CLI and the platform include this case in
every check.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `emptyTrace` | `string` \| `Uint8Array`\<`ArrayBufferLike`\> | `''` | The caller's "no inputs" trace representation. Defaults to the empty string (the platform's canonical empty trace); the reducer-lane CLI passes its codec's empty envelope (`encodeTrace([])`) so the run's own decoder accepts it. |

## Returns

[`SelfCheckCase`](index.Interface.SelfCheckCase.md)
