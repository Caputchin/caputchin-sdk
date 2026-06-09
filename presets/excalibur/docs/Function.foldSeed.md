# Function: foldSeed()

> **foldSeed**(`seed`): `number`

Fold a 128-bit platform [Seed](TypeAlias.Seed.md) into a single unsigned 32-bit integer, for
APIs that take a numeric seed (e.g. `ex.Random`). The gameplay RNG should use
the full-entropy `rng(seed)` from `@caputchin/determinism` instead; this is only
for engine internals that demand a number. Never zero (some PRNGs degenerate on
a zero seed), so a zero fold maps to 1.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `seed` | [`Seed`](TypeAlias.Seed.md) |

## Returns

`number`
