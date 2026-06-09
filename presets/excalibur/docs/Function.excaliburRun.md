# Function: excaliburRun()

> **excaliburRun**\<`C`\>(`game`): [`RunFn`](TypeAlias.RunFn.md)\<`C`\>

Build the conforming `run` from an [ExcaliburGame](Interface.ExcaliburGame.md). The game's run entry
does:

  import '@caputchin/preset-excalibur/install'; // must be first
  import { excaliburRun } from '@caputchin/preset-excalibur';
  import { game } from './game.js';
  export const run = excaliburRun(game);

Each `run()` re-establishes the deterministic headless env first (the replay
self-check prober shadows globals per call), then replays.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `C` | `unknown` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | [`ExcaliburGame`](Interface.ExcaliburGame.md) |

## Returns

[`RunFn`](TypeAlias.RunFn.md)\<`C`\>
