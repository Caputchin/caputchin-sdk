# Function: replay()

> **replay**\<`S`, `A`, `C`, `V`\>(`engine`, `input`): [`ReplayOutcome`](Interface.ReplayOutcome.md)

Re-run a recorded round under the fixed-step loop: start `engine` from its
seeded initial state, apply each recorded action on the tick it was recorded
for (preserving order within a tick), and return the [ReplayOutcome](Interface.ReplayOutcome.md).
This is the same deterministic loop that drives live play, so a
[toRun](Function.toRun.md)-wrapped engine reproduces the live result exactly under the
issued seed (live score equals replay score by construction).

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `S` | - |
| `A` | - |
| `C` | - |
| `V` | `S` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`EngineDef`](Interface.EngineDef.md)\<`S`, `A`, `C`, `V`\> |
| `input` | [`ReplayInput`](Interface.ReplayInput.md)\<`A`, `C`\> |

## Returns

[`ReplayOutcome`](Interface.ReplayOutcome.md)
