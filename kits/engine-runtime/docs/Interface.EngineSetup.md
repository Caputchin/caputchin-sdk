# Interface: EngineSetup\<C\>

Setup handed to `init`. `config` is the RAW, server-resolved gameplay config
(the per-site dashboard config), opaque to the platform and possibly `null`
(no config supplied). `init` is the SINGLE place that raw config is
transformed into the engine's internal sim parameters - including resolving
`null` to the engine's own defaults - so the live game and the headless
replay, both calling `init` with the same raw config, cannot diverge.

## Type Parameters

| Type Parameter |
| ------ |
| `C` |

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="config"></a> `config` | `readonly` | `C` \| `null` | Raw server-resolved gameplay config, or `null` when no config is configured for the site key. `init` is responsible for resolving `null` to the engine's own defaults. |
| <a id="seed"></a> `seed` | `readonly` | [`Seed`](TypeAlias.Seed.md) | Server-derived per-round seed. Seed your PRNG here via `cap.rng(setup.seed)` and store it in state. |
