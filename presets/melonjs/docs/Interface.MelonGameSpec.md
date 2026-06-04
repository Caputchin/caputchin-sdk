# Interface: MelonGameSpec\<S, A, C, V\>

A melonJS game using the full engine. The preset builds the Application and
drives `world.update`; the author owns the scene + reads the verdict.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `S` | - |
| `A` | `unknown` |
| `C` | `unknown` |
| `V` | `S` |

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="height"></a> `height` | `readonly` | `number` | - |
| <a id="me"></a> `me` | `readonly` | `__module` | The melonJS namespace. |
| <a id="width"></a> `width` | `readonly` | `number` | Design resolution (world units). |

## Methods

### afterStep() {#afterstep}

> **afterStep**(`state`, `api`): `S`

Called once per fixed step, AFTER the trap-wrapped `world.update`; read the
 engine state (positions, collisions, score) back into serializable `S`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | `S` |
| `api` | [`MelonGameApi`](Interface.MelonGameApi.md)\<`C`\> |

#### Returns

`S`

***

### input() {#input}

> **input**(`state`, `action`, `api`): `S`

Apply one player action at its logical tick.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | `S` |
| `action` | `A` |
| `api` | [`MelonGameApi`](Interface.MelonGameApi.md)\<`C`\> |

#### Returns

`S`

***

### isOver() {#isover}

> **isOver**(`state`): `boolean`

True when the round has ended.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | `S` |

#### Returns

`boolean`

***

### result() {#result}

> **result**(`state`): [`Result`](Interface.Result.md)

Final score + the engine's own pass decision.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | `S` |

#### Returns

[`Result`](Interface.Result.md)

***

### setup() {#setup}

> **setup**(`api`): `S`

Build the physics scene into `api.app.world`; seed from `api.seed`, resolve
 `api.config`; return serializable game state `S` (stash live refs in `api.ctx`).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `api` | [`MelonGameApi`](Interface.MelonGameApi.md)\<`C`\> |

#### Returns

`S`

***

### view()? {#view}

> `optional` **view**(`state`): `V`

Optional render projection (live renderer reads it; never replayed).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | `S` |

#### Returns

`V`
