# Function: selfCheck()

> **selfCheck**\<`C`\>(`run`, `cases`, `opts?`): `Promise`\<[`SelfCheckReport`](index.Interface.SelfCheckReport.md)\>

Probe a `run` for determinism over the given cases. For each case the run is
replayed many times under a hostile, isolate-equivalent environment; the
report flags any case whose verdict is unstable across re-runs or depends on
ambient non-determinism (wall-clock, `Math.random`/`crypto`, native trig, or
other banned IO surfaces). `ok` is true only when every case is deterministic.

The run is invoked with shared globals temporarily patched, so callers MUST
NOT run other code concurrently with `selfCheck` (a dev/CI invocation is the
intended context). Cases are probed sequentially for the same reason.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `C` | `unknown` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `run` | [`RunFn`](index.TypeAlias.RunFn.md)\<`C`\> |
| `cases` | readonly [`SelfCheckCase`](index.Interface.SelfCheckCase.md)\<`C`\>[] |
| `opts` | [`SelfCheckOptions`](index.Interface.SelfCheckOptions.md) |

## Returns

`Promise`\<[`SelfCheckReport`](index.Interface.SelfCheckReport.md)\>
