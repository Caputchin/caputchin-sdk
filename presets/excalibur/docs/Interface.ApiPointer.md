# Interface: ApiPointer

Live pointer state for the current tick.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="events"></a> `events` | `readonly` | readonly [`ApiPointerEvent`](Interface.ApiPointerEvent.md)[] | Pointer events that landed on THIS tick, in order - the rich-gesture channel (a slash / drag is a run of these). Empty on ticks with no pointer input. |
| <a id="isdown"></a> `isDown` | `readonly` | `boolean` | Whether the pointer is currently pressed. |
| <a id="x"></a> `x` | `readonly` | `number` | Last known pointer position in world space (the latest move/down this round). |
| <a id="y"></a> `y` | `readonly` | `number` | - |
