# Interface: ExcaliburGameApi

The deterministic API a sim reads each fixed tick. The SAME object is handed to
the game factory in the browser and in the headless replay, so sim code written
against it reproduces identically both ends.

Read input ONLY through this api (pointer + named actions) and randomness ONLY
through `rand*` (the preset's seeded RNG). Never read `engine.input`, the wall
clock, the network, `Math.random`, or `Date` from sim code.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="ctx"></a> `ctx` | `readonly` | [`GameContext`](Interface.GameContext.md) \| `null` | Server round context: `seed`, opaque `config`, and (live only) `locale`/`skin`. `config` is the ONLY safe source for gate-affecting params; read sim params from it, never from input. |
| <a id="headless"></a> `headless` | `readonly` | `boolean` | True inside the headless replay; false in the browser. Guard render-only setup with this. |
| <a id="pointer"></a> `pointer` | `readonly` | [`ApiPointer`](Interface.ApiPointer.md) | Pointer input - the primary (rich-gesture) channel. |
| <a id="tick"></a> `tick` | `readonly` | `number` | Current logical sim tick (0-based; tick 0 is the first fixed update after the scene starts). |

## Methods

### announce() {#announce}

> **announce**(`message`): `void`

Announce a game-state change to assistive tech (live only; no-op headless).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |

#### Returns

`void`

***

### chance() {#chance}

> **chance**(`p`): `boolean`

True with probability `p`, seeded.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `p` | `number` |

#### Returns

`boolean`

***

### choose() {#choose}

> **choose**\<`T`\>(`arr`): `T`

Seeded pick from a non-empty array.

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

### gameOver() {#gameover}

> **gameOver**(): `void`

End the round. The headless run stops; the live driver fires the game-over flow.

#### Returns

`void`

***

### isDown() {#isdown}

> **isDown**(`action`): `boolean`

Whether `action` is currently held.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `action` | `string` |

#### Returns

`boolean`

***

### justPressed() {#justpressed}

> **justPressed**(`action`): `boolean`

Whether `action` went down on THIS tick.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `action` | `string` |

#### Returns

`boolean`

***

### justReleased() {#justreleased}

> **justReleased**(`action`): `boolean`

Whether `action` was released on THIS tick.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `action` | `string` |

#### Returns

`boolean`

***

### onTick() {#ontick}

> **onTick**(`cb`): `void`

Register a per-tick sim callback. Called once per fixed tick, AFTER this
 tick's input has been applied to the api, on both ends. The place to put all
 gate logic so live and replay run the identical code.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | () => `void` |

#### Returns

`void`

***

### pass() {#pass}

> **pass**(): `void`

Latch the pass: the captcha is satisfied at the current score. Idempotent.

#### Returns

`void`

***

### press() {#press}

> **press**(`action`): `void`

Inject a live named-action edge (touch buttons / gamepad). No-op headless.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `action` | `string` |

#### Returns

`void`

***

### rand() {#rand}

> **rand**(): `number`

Next seeded float in [0, 1).

#### Returns

`number`

***

### randi() {#randi}

> **randi**(`maxExclusive`): `number`

Seeded integer in [0, maxExclusive).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `maxExclusive` | `number` |

#### Returns

`number`

***

### randiRange() {#randirange}

> **randiRange**(`min`, `maxInclusive`): `number`

Seeded integer in [min, maxInclusive].

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `min` | `number` |
| `maxInclusive` | `number` |

#### Returns

`number`

***

### release() {#release}

> **release**(`action`): `void`

Live counterpart to [press](#press). No-op headless.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `action` | `string` |

#### Returns

`void`

***

### setScore() {#setscore}

> **setScore**(`score`): `void`

Set the current score (carried into the verdict).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `score` | `number` |

#### Returns

`void`
