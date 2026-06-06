# Function: isHumanReaction()

> **isHumanReaction**(`appearTick`, `hitTick`, `floorTicks?`): `boolean`

Whether acting on a target at `hitTick` is a plausibly-human reaction to it
becoming actionable at `appearTick` (the latency is at least `floorTicks`).
A hit on (or before) the tick the target appeared is superhuman and should not
count toward score or the pass decision. Set `appearTick` to the tick the target
became ACTIONABLE (entered play / emerged), not merely allocated.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `appearTick` | `number` | Logical tick the target became actionable. |
| `hitTick` | `number` | Logical tick the scoring action was applied. |
| `floorTicks` | `number` | Minimum latency in ticks (default [reactionFloorTicks](Function.reactionFloorTicks.md)). |

## Returns

`boolean`

`true` if `hitTick - appearTick >= floorTicks`.
