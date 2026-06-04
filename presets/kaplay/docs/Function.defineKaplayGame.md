# Function: defineKaplayGame()

> **defineKaplayGame**(`factory`, `options`): [`KaplayGame`](Interface.KaplayGame.md)

Package a KAPLAY scene factory + options into a [KaplayGame](Interface.KaplayGame.md) that can be
mounted live ([mountKaplayGame](Function.mountKaplayGame.md)) or replayed headless ([kaplayRun](Function.kaplayRun.md)).

The `factory` builds the scene and registers the sim in `onFixedUpdate`; it
receives the live KAPLAY context and the deterministic [KaplayGameApi](Interface.KaplayGameApi.md).
Write the sim against the api (named-action input + seeded RNG helpers), keep
it free of wall-clock / `Math.random` / `shuffle`, and the same code runs both
in the browser and on the server.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `factory` | [`KaplaySceneFactory`](TypeAlias.KaplaySceneFactory.md) |
| `options` | [`KaplayGameOptions`](Interface.KaplayGameOptions.md) |

## Returns

[`KaplayGame`](Interface.KaplayGame.md)

## Example

```ts
export const game = defineKaplayGame((k, api) => {
  const player = k.add([k.rect(20, 20), k.pos(100, 100)]);
  k.onFixedUpdate(() => {
    if (api.isDown('left')) player.move(-100, 0);
    if (api.isDown('right')) player.move(100, 0);
  });
}, {
  actions: ['left', 'right'],
  keys: { left: ['left', 'a'], right: ['right', 'd'] },
  maxTicks: 60 * 50,
  kaplay: { width: 320, height: 240 },
});
```
