# Function: applyShim()

> **applyShim**(`scope?`): `string`[]

Apply the deterministic environment to the current global scope. Idempotent;
call once before importing/running the engine. Returns the list of names it
neutralized (for diagnostics/tests).

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `scope` | `object` | `globalThis` |

## Returns

`string`[]
