# Function: createMelonDriver()

> **createMelonDriver**\<`S`, `A`, `C`, `V`\>(`spec`, `app`, `setup`): `object`

## Type Parameters

| Type Parameter |
| ------ |
| `S` |
| `A` |
| `C` |
| `V` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`MelonGameSpec`](Interface.MelonGameSpec.md)\<`S`, `A`, `C`, `V`\> |
| `app` | `Application` |
| `setup` | \{ `config`: `C` \| `null`; `seed`: [`Seed`](TypeAlias.Seed.md); \} |
| `setup.config` | `C` \| `null` |
| `setup.seed` | [`Seed`](TypeAlias.Seed.md) |

## Returns

`object`

| Name | Type |
| ------ | ------ |
| `driver` | [`MelonDriver`](Interface.MelonDriver.md)\<`S`, `A`, `C`\> |
| `state` | `S` |
