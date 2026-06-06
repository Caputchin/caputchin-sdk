# Function: reactionFloorTicks()

> **reactionFloorTicks**(`ms?`): `number`

Convert a reaction floor in milliseconds to whole logical ticks (rounded up, so
the floor is never weaker than asked). Defaults to [REACTION\_FLOOR\_MS](Variable.REACTION_FLOOR_MS.md).

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `ms` | `number` | `REACTION_FLOOR_MS` | Floor in milliseconds. |

## Returns

`number`

Floor in ticks (`ceil(ms / FIXED_TIMESTEP_MS)`).
