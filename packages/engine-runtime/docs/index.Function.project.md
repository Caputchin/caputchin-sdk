# Function: project()

> **project**\<`S`, `A`, `C`, `V`\>(`engine`, `state`): `S` \| `V`

What the live driver sends to the factory's `onState` each tick: the engine's
`view(state)` projection when it defines one, otherwise the full state. This
is a LIVE-render concern only - replay (`harness.replay`) never calls it, so
`view` cannot influence the authoritative verdict. Centralized here so the
"view-or-full-state" rule lives in one place the driver imports.

## Type Parameters

| Type Parameter |
| ------ |
| `S` |
| `A` |
| `C` |
| `V` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`EngineDef`](index.Interface.EngineDef.md)\<`S`, `A`, `C`, `V`\> |
| `state` | `S` |

## Returns

`S` \| `V`
