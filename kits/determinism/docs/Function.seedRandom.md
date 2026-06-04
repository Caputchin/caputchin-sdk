# Function: seedRandom()

> **seedRandom**(`seed`, `scope?`): `void`

Seed the engine-visible `Math.random` PERSISTENTLY on `scope` with a small
deterministic PRNG (mulberry32 over the 4-word seed), so an engine that reads
`Math.random` directly produces the same stream live and on replay. Use this
for a framework that drives a fixed-step loop where seeding once per run is
enough - vs [withDeterministicEnv](Function.withDeterministicEnv.md), which seeds per step + restores (for
engines whose render-side code between steps must NOT consume the stream).

Write-only: it overwrites `Math.random` without ever reading the existing one,
so it is safe under the replay self-check's banned-global probe (which throws on
reading `Math.random`, but a plain assignment just replaces it).

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `seed` | readonly `number`[] | `undefined` |
| `scope` | *typeof* `globalThis` | `globalThis` |

## Returns

`void`
