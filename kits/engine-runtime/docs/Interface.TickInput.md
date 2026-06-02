# Interface: TickInput\<A\>

One recorded input the replay loop applies: the author's `action`, stamped
with the LOGICAL tick it lands on (never wall-clock). This is a structural
helper for the kit's loop + codec, generic over the author's action type - it
is not a "trace" the platform sees.

## Type Parameters

| Type Parameter |
| ------ |
| `A` |

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="action"></a> `action` | `readonly` | `A` | The player action to pass to `engine.step` at this tick. |
| <a id="tick"></a> `tick` | `readonly` | `number` | Logical tick index at which this action lands. Zero-based, matching the loop counter in [replay](Function.replay.md). |
