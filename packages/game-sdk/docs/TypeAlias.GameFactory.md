# Type Alias: GameFactory

> **GameFactory** = (`container`, `bridge`, `ctx?`) => (() => `void`) \| `void`

The function you hand to [register](Function.register.md). The widget calls it once per
 mount with the `container` element to render into, the [Bridge](Interface.Bridge.md)
 control surface, and the per-session [GameContext](Interface.GameContext.md) (seed, locale,
 skin, config). Return an optional cleanup function the widget calls when the
 round tears down.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `container` | `HTMLElement` |
| `bridge` | [`Bridge`](Interface.Bridge.md) |
| `ctx?` | [`GameContext`](Interface.GameContext.md) |

## Returns

(() => `void`) \| `void`
