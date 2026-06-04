# Function: withDeterministicEnv()

> **withDeterministicEnv**\<`T`\>(`env`, `fn`): `T`

Run `fn` with the full deterministic environment installed, then RESTORE the
originals afterward (even if `fn` throws). For the duration of `fn`:
the transcendental `Math.*` are swapped to [capMath](index.Variable.capMath.md), `Math.random` is
the seeded `env.random`, and `Date.now` / `performance.now` return
`env.nowMs`.

This is the SCOPED, restorable counterpart to [makeDeterministic](index.Function.makeDeterministic.md): a
framework-as-sim preset that drives a manual fixed-step loop wraps each engine
`update(dt)` in this, so the bundled engine's own `Math.random` / clock reads
are deterministic during the step, while render-side code BETWEEN steps (live
play only) keeps the real globals and never consumes the seeded stream - which
would otherwise desync the live run from the server replay (the server only
consumes the stream during the step). Pass `env.nowMs = tick * fixedStepMs` so
the clock advances one fixed step per call.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `env` | [`DeterministicEnv`](index.Interface.DeterministicEnv.md) |
| `fn` | () => `T` |

## Returns

`T`
