# Interface: MelonDriver\<S, A, C\>

Create the per-round driver state shared by the headless engine and the live
 mount: builds the Application, seeds rng, and exposes the fixed-step advance.

## Type Parameters

| Type Parameter |
| ------ |
| `S` |
| `A` |
| `C` |

## Properties

| Property | Modifier | Type |
| ------ | ------ | ------ |
| <a id="api"></a> `api` | `readonly` | [`MelonGameApi`](Interface.MelonGameApi.md)\<`C`\> |

## Methods

### step() {#step}

> **step**(`state`, `action`): `S`

Apply a recorded/live action.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | `S` |
| `action` | `A` |

#### Returns

`S`

***

### tick() {#tick}

> **tick**(`state`): `S`

Advance exactly one fixed timestep: trap-wrapped `world.update` + `afterStep`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | `S` |

#### Returns

`S`
