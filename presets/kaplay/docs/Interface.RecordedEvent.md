# Interface: RecordedEvent

One recorded action edge: a press/release of an action index at a logical tick.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="action"></a> `action` | `readonly` | `number` | Action index (position in [KaplayGameOptions.actions](Interface.KaplayGameOptions.md#actions)). |
| <a id="press"></a> `press` | `readonly` | `boolean` | True for a press, false for a release. |
| <a id="tick"></a> `tick` | `readonly` | `number` | Logical sim tick the event was applied at (0-based). |
