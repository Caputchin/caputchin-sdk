# Function: rng()

> **rng**(`seed`): [`Rng`](Interface.Rng.md)

Build a fresh PRNG from a 128-bit engine seed. The stream is mixed with a
fixed warm-up so low-entropy seeds (e.g. mostly-zero words) decorrelate
before first use; the warmed state is what `state` returns, so a later
`rngFromState` resumes exactly.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `seed` | readonly \[`number`, `number`, `number`, `number`\] |

## Returns

[`Rng`](Interface.Rng.md)
