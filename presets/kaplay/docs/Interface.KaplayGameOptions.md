# Interface: KaplayGameOptions

Options for [defineKaplayGame](Function.defineKaplayGame.md): the action set, key bindings, the replay tick cap, and KAPLAY init options.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="actions"></a> `actions` | `readonly` | readonly `string`[] | Ordered action names. The index is the wire code in the trace, so APPEND new actions; never reorder or remove (it would misread old traces). |
| <a id="kaplay"></a> `kaplay?` | `readonly` | `Partial`\<`KAPLAYOpt`\<`any`, `any`\>\> | KAPLAY init options merged into both ends (width/height/background/pixelDensity/...). `canvas`/`global` are managed by the preset. |
| <a id="keys"></a> `keys?` | `readonly` | `Readonly`\<`Record`\<`string`, readonly `string`[]\>\> | Keyboard bindings per action for the live driver, e.g. `{ left: ['left', 'a'] }`. KAPLAY key names. |
| <a id="load"></a> `load?` | `readonly` | (`k`) => `void` | Optional asset-load hook, run once at boot before the scene is entered (e.g. `k.loadSprite(...)`). The preset waits for all loads to finish before starting the sim, so loading never perturbs determinism. Omit for a procedural game with no assets. |
| <a id="maxticks"></a> `maxTicks` | `readonly` | `number` | Max sim ticks before a replay is declared truncated (and rejected). Set above the longest legit round. |
