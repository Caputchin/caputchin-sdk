# Function: mulberry32()

> **mulberry32**(`seed`): () => `number`

mulberry32: a tiny PRNG with 32-bit state. Pure integer ops (`Math.imul`, shifts,
xor) plus one float divide, so its stream is bit-identical across V8 builds
(browser == server) and untouched by the deterministic-Math swap. Shared by
[seedRandom](Function.seedRandom.md) and [createMathRandomTrap](Function.createMathRandomTrap.md).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `seed` | `number` |

## Returns

() => `number`
