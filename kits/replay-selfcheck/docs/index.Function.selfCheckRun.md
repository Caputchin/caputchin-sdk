# Function: selfCheckRun()

> **selfCheckRun**\<`C`\>(`run`, `opts?`): `Promise`\<[`SelfCheckReport`](index.Interface.SelfCheckReport.md)\>

Convenience over [selfCheck](index.Function.selfCheck.md) for callers with no recorded trace (the
platform at vendor / upload / index time): probes the [smokeCase](index.Function.smokeCase.md) plus
each seed over the empty trace. The author CLI, which DOES have recorded
traces, builds its own richer case list and calls [selfCheck](index.Function.selfCheck.md) directly.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `C` | `unknown` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `run` | `RunFn`\<`C`\> |
| `opts` | [`SelfCheckRunOptions`](index.Interface.SelfCheckRunOptions.md) |

## Returns

`Promise`\<[`SelfCheckReport`](index.Interface.SelfCheckReport.md)\>
