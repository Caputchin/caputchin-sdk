# Interface: Rng

Deterministic PRNG seeded from a [Seed](TypeAlias.Seed.md). Built on sfc32 (Small Fast
Counter, 128-bit state) using only 32-bit integer operations, so the stream
is bit-identical across every JS engine and V8 version.

Keep the `Rng` instance (or its [RngState](TypeAlias.RngState.md)) in your engine state so
the stream survives structured-clone serialization across the worker
boundary. Create with [rng](Function.rng.md); resume a saved stream with
[rngFromState](Function.rngFromState.md).

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="state"></a> `state` | `readonly` | [`RngState`](TypeAlias.RngState.md) | Current PRNG state as a plain serializable tuple. Store in engine state to resume the exact stream later via [rngFromState](Function.rngFromState.md). |

## Methods

### bool() {#bool}

> **bool**(`p?`): `boolean`

Returns `true` with probability `p`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `p?` | `number` | Probability in `[0, 1]`. Defaults to `0.5`. |

#### Returns

`boolean`

***

### int() {#int}

> **int**(`maxExclusive`): `number`

Random integer in `[0, maxExclusive)`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `maxExclusive` | `number` | Upper bound, exclusive. Must be positive. |

#### Returns

`number`

***

### intBetween() {#intbetween}

> **intBetween**(`min`, `maxInclusive`): `number`

Random integer in `[min, maxInclusive]`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `min` | `number` | Lower bound, inclusive. |
| `maxInclusive` | `number` | Upper bound, inclusive. |

#### Returns

`number`

***

### next() {#next}

> **next**(): `number`

Next float in `[0, 1)`.

#### Returns

`number`

***

### pick() {#pick}

> **pick**\<`T`\>(`arr`): `T`

Uniformly selects one element from `arr`. Throws if `arr` is empty.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | readonly `T`[] | Non-empty array to pick from. |

#### Returns

`T`

***

### range() {#range}

> **range**(`min`, `max`): `number`

Random float in `[min, max)`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `min` | `number` | Lower bound, inclusive. |
| `max` | `number` | Upper bound, exclusive. |

#### Returns

`number`

***

### shuffle() {#shuffle}

> **shuffle**\<`T`\>(`arr`): `T`[]

Returns a new array that is a Fisher-Yates shuffle of `arr`. The input
array is not mutated.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | readonly `T`[] | Array to shuffle. |

#### Returns

`T`[]
