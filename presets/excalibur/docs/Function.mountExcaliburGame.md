# Function: mountExcaliburGame()

> **mountExcaliburGame**(`game`, `args`): () => `void`

Mount an [ExcaliburGame](Interface.ExcaliburGame.md) live in the iframe. Call from the SDK `register`
callback: `register((container, bridge, ctx) => mountExcaliburGame(game, { container, bridge, ctx }))`.
Returns a cleanup function.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | [`ExcaliburGame`](Interface.ExcaliburGame.md) |
| `args` | [`MountArgs`](Interface.MountArgs.md) |

## Returns

() => `void`
