# Interface: DeterministicEnv

The seeded randomness + fixed clock a [withDeterministicEnv](index.Function.withDeterministicEnv.md) call
installs for the duration of one trapped function. The caller supplies the
seeded stream (e.g. this kit's own rng), so the trap itself stays
PRNG-agnostic.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="nowms"></a> `nowMs` | `readonly` | `number` | Fixed value (ms) returned by `Date.now` / `performance.now` during the call. |
| <a id="random"></a> `random` | `readonly` | () => `number` | Seeded replacement for `Math.random` during the trapped call. |
