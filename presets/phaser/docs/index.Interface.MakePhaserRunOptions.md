# Interface: MakePhaserRunOptions\<Action, C\>

Options for [makePhaserRun](index.Function.makePhaserRun.md).

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `Action` | - |
| `C` | `unknown` |

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="height"></a> `height` | `readonly` | `number` | - |
| <a id="maxticks"></a> `maxTicks` | `readonly` | `number` | Hard tick ceiling (guards the isolate cpuMs cap). |
| <a id="physics"></a> `physics?` | `readonly` | `PhysicsConfig` | Phaser physics config (e.g. `{ default: 'arcade', arcade: { fixedStep: true, fps: 60 } }`). Arcade is made deterministic by the preset: fixed step + seeded RNG + deterministic transcendentals. Always set fixedStep + a fixed fps. |
| <a id="stepms"></a> `stepMs?` | `readonly` | `number` | Fixed timestep in ms. Defaults to 1000/60. MUST match the live game's fps. |
| <a id="width"></a> `width` | `readonly` | `number` | - |

## Methods

### createScene() {#createscene}

> **createScene**(`ctx`): [`PhaserSceneHandle`](index.Interface.PhaserSceneHandle.md)

Build the headless replay scene for a round.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ctx` | [`PhaserRunContext`](index.Interface.PhaserRunContext.md)\<`Action`, `C`\> |

#### Returns

[`PhaserSceneHandle`](index.Interface.PhaserSceneHandle.md)

***

### decode() {#decode}

> **decode**(`trace`): readonly `Action`[]

Decode the opaque trace into per-tick actions (index = tick).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `trace` | `string` \| `Uint8Array`\<`ArrayBufferLike`\> |

#### Returns

readonly `Action`[]
