# Function: foldSeed()

> **foldSeed**(`seed`): `number`

Fold the four-word platform [Seed](TypeAlias.Seed.md) into one positive integer below 2^31,
which is what KAPLAY's `randSeed` accepts. Uses a fixed integer hash
(`Math.imul`), so it is bit-identical on every runtime.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `seed` | [`Seed`](TypeAlias.Seed.md) |

## Returns

`number`
