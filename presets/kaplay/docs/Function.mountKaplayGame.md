# Function: mountKaplayGame()

> **mountKaplayGame**(`game`, `args`): () => `void`

Mount a [KaplayGame](Interface.KaplayGame.md) live in the iframe. Call from the SDK `register`
callback: `register((container, bridge, ctx) => mountKaplayGame(game, { container, bridge, ctx }))`.
Returns a cleanup function.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | [`KaplayGame`](Interface.KaplayGame.md) |
| `args` | [`MountArgs`](Interface.MountArgs.md) |

## Returns

() => `void`
