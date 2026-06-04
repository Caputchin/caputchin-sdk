# Function: defineMelonGame()

> **defineMelonGame**\<`S`, `A`, `C`, `V`\>(`spec`): [`EngineDef`](Interface.EngineDef.md)\<`S`, `A`, `C`, `V`\>

Adapt a [MelonGameSpec](Interface.MelonGameSpec.md) into an engine-kit [EngineDef](Interface.EngineDef.md) for the
HEADLESS replay path. Pair with `toRun`:

```ts
import * as me from 'melonjs';
import { toRun } from '@caputchin/engine-kit';
import { defineMelonGame } from '@caputchin/preset-melonjs';
export const run = toRun(defineMelonGame({ me, width, height, setup, input, afterStep, isOver, result }), { maxTicks });
```

The init boots a headless `me.Application` (CANVAS renderer, no GL), installs
the DOM shim if there is no real DOM, and drives `world.update` under the trap.
One active round per engine instance.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `S` | - |
| `A` | `unknown` |
| `C` | `unknown` |
| `V` | `S` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`MelonGameSpec`](Interface.MelonGameSpec.md)\<`S`, `A`, `C`, `V`\> |

## Returns

[`EngineDef`](Interface.EngineDef.md)\<`S`, `A`, `C`, `V`\>
