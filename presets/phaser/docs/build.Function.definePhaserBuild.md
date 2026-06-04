# Function: definePhaserBuild()

> **definePhaserBuild**(`opts`): `Options`[]

Produce the dual tsup config a Phaser game ships:

  - a minified IIFE live bundle (`dist/<gameId>.js`) loaded in the widget iframe,
    with phaser and all assets inlined (the iframe CSP forbids runtime fetch);
  - a minified ESM headless bundle (`dist/run.js`) the replay isolate imports.

Both bundle phaser in (it is the engine, not an external the isolate provides).
The run entry must import `@caputchin/preset-phaser/install` first so the shim
is in place before phaser evaluates (see the package README).

Drop the result into the game's `tsup.config.ts`:

  import { defineConfig } from 'tsup';
  import { definePhaserBuild } from '@caputchin/preset-phaser/build';
  export default defineConfig(definePhaserBuild({ gameId: 'my-game' }));

## Parameters

| Parameter | Type |
| ------ | ------ |
| `opts` | [`PhaserBuildOptions`](build.Interface.PhaserBuildOptions.md) |

## Returns

`Options`[]
