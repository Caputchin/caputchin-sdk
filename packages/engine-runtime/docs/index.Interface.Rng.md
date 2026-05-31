# Interface: Rng

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="state"></a> `state` | `readonly` | [`RngState`](index.TypeAlias.RngState.md) | Current internal state as a plain serializable tuple. |

## Methods

### bool() {#bool}

> **bool**(`p?`): `boolean`

True with probability p (default 0.5).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `p?` | `number` |

#### Returns

`boolean`

***

### int() {#int}

> **int**(`maxExclusive`): `number`

Integer in [0, maxExclusive).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `maxExclusive` | `number` |

#### Returns

`number`

***

### intBetween() {#intbetween}

> **intBetween**(`min`, `maxInclusive`): `number`

Integer in [min, maxInclusive].

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `min` | `number` |
| `maxInclusive` | `number` |

#### Returns

`number`

***

### next() {#next}

> **next**(): `number`

Next float in [0, 1).

#### Returns

`number`

***

### pick() {#pick}

> **pick**\<`T`\>(`arr`): `T`

A uniformly chosen element.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `arr` | readonly `T`[] |

#### Returns

`T`

***

### range() {#range}

> **range**(`min`, `max`): `number`

Float in [min, max).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `min` | `number` |
| `max` | `number` |

#### Returns

`number`

***

### shuffle() {#shuffle}

> **shuffle**\<`T`\>(`arr`): `T`[]

A new array, Fisher-Yates shuffled (input untouched).

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `arr` | readonly `T`[] |

#### Returns

`T`[]
