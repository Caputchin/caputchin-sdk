# Interface: SelfCheckCase\<C\>

One determinism probe: a seed + the opaque trace recorded under it, optionally
 under a specific server config (defaults to `null` → the run's own defaults).
 Generic over the run's config shape so a typed `RunFn<C>` self-checks without
 a cast; defaults to the opaque ReplayConfig.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `C` | `ReplayConfig` |

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="config"></a> `config?` | `readonly` | `C` \| `null` | Server config the run executes under; `null`/omitted exercises the run's internal defaults (the MVP server behavior). |
| <a id="label"></a> `label?` | `readonly` | `string` | Optional human label for the report (defaults to `case #n`). |
| <a id="seed"></a> `seed` | `readonly` | `Seed` | - |
| <a id="trace"></a> `trace` | `readonly` | `string` \| `Uint8Array`\<`ArrayBufferLike`\> | - |
