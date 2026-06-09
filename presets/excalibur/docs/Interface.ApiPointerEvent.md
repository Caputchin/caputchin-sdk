# Interface: ApiPointerEvent

A pointer event the sim sees this tick, in the game's fixed world space.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="kind"></a> `kind` | `readonly` | [`PointerKind`](TypeAlias.PointerKind.md) | 0 = down, 1 = move, 2 = up. |
| <a id="x"></a> `x` | `readonly` | `number` | - |
| <a id="y"></a> `y` | `readonly` | `number` | - |
