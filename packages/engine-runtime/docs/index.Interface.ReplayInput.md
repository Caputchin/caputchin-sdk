# Interface: ReplayInput\<A, C\>

Inputs to a single replay run.

## Type Parameters

| Type Parameter |
| ------ |
| `A` |
| `C` |

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="actions"></a> `actions` | `readonly` | readonly [`TickInput`](index.Interface.TickInput.md)\<`A`\>[] | - |
| <a id="config"></a> `config` | `readonly` | `C` \| `null` | - |
| <a id="maxticks"></a> `maxTicks` | `readonly` | `number` | Upper bound on ticks to run, guarding a non-terminating engine. |
| <a id="seed"></a> `seed` | `readonly` | [`Seed`](index.TypeAlias.Seed.md) | - |
