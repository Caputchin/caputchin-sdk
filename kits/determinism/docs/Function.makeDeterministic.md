# Function: makeDeterministic()

> **makeDeterministic**(`scope?`): `string`[]

Prepare `scope` to run deterministically. Currently this is [swapMath](Function.swapMath.md);
it is the single composition point future deterministic stubs (clock, RNG)
will be added to, so callers get the full environment from one call. Returns
the names of the globals it touched.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `scope` | `object` | `globalThis` |

## Returns

`string`[]
