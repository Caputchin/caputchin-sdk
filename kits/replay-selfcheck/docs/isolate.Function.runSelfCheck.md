# Function: runSelfCheck()

> **runSelfCheck**\<`C`\>(`run`, `opts?`): `Promise`\<[`SelfCheckReport`](index.Interface.SelfCheckReport.md)\>

Probe `run` for determinism inside the replay isolate. Thin alias over
[selfCheckRun](index.Function.selfCheckRun.md) under a name that reads clearly at the Worker host-wrapper
call site. Returns the aggregate [SelfCheckReport](index.Interface.SelfCheckReport.md); `report.ok` is the
gate signal the platform stores as `selfCheckOk`.

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
