# Function: bootHeadlessPhaser()

> **bootHeadlessPhaser**(`config`): `Promise`\<`Game`\>

Boot a headless Phaser game and resolve once it is ready to be stepped.

Forces `type: Phaser.HEADLESS` (no renderer), disables audio and the banner,
and resolves the returned promise from the `postBoot` callback (fired after the
texture manager and the initial scene are ready). The caller then stops the
auto loop and advances the sim manually with `game.headlessStep(t, dt)`.

The headless shim MUST already be installed (see `@caputchin/preset-phaser/install`)
before this runs, otherwise phaser cannot evaluate.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | `GameConfig` |

## Returns

`Promise`\<`Game`\>
