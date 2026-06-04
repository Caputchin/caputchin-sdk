# Interface: MelonGameApi\<C\>

Per-round context handed to every spec method.

## Type Parameters

| Type Parameter |
| ------ |
| `C` |

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="app"></a> `app` | `readonly` | `Application` | The booted Application; build your scene into `app.world`. |
| <a id="config"></a> `config` | `readonly` | `C` \| `null` | Raw server-resolved config, or `null` (resolve `null` to defaults in `setup`). |
| <a id="ctx"></a> `ctx` | `readonly` | `Record`\<`string`, `unknown`\> | Scratch for non-serializable refs (entities, the Stage); persists per round. |
| <a id="me"></a> `me` | `readonly` | `__module` | The consumer-provided melonJS namespace. |
| <a id="rng"></a> `rng` | `readonly` | () => `number` | Game randomness - a seeded stream INDEPENDENT of the engine-internal trap. |
| <a id="seed"></a> `seed` | `readonly` | [`Seed`](TypeAlias.Seed.md) | Server-derived per-round seed. |
