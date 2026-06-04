# Interface: KaplayGameApi

The deterministic API a KAPLAY sim reads each fixed tick. The SAME object is
handed to the scene factory in the browser and in the headless replay, so sim
code written against it reproduces identically both ends.

Read input as named actions (declared in [KaplayGameOptions.actions](Interface.KaplayGameOptions.md#actions)),
never raw keys, so the trace is input-device-agnostic. Randomness is free to
come from KAPLAY's own `k.rand()` (the preset seeds it and drives a fixed
timestep, so it is deterministic), these convenience helpers, KAPLAY's
`shuffle`/`chooseMultiple`, or even raw `Math.random()` in the sim - the preset
seeds `Math.random` too, so all of them reproduce both ends. Never read input,
a wall clock, or anything outside `api` and the seeded RNG.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="ctx"></a> `ctx` | `readonly` | [`GameContext`](Interface.GameContext.md) \| `null` | Server round context: `seed`, opaque `config`, and (live only) `locale` / `skin`. `config` is present both ends and is the ONLY safe source for gate-affecting params (pass threshold, board size); read sim params from it, never from input. `locale`/`skin` are render-only and null in headless. |
| <a id="headless"></a> `headless` | `readonly` | `boolean` | True inside the headless replay; false in the browser. Guard render-only setup with this. |
| <a id="tick"></a> `tick` | `readonly` | `number` | Current logical sim tick (0-based; tick 0 is the scene's first fixed update after load). |

## Methods

### announce() {#announce}

> **announce**(`message`): `void`

Announce a game-state change to assistive tech via the live driver's
polite ARIA live region (e.g. "two lines cleared", "game over"). No-op in
headless. The canvas is opaque to screen readers, so this is how a sim
surfaces state non-visually.

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

### pass() {#pass}

> **pass**(): `void`

Latch the pass: the captcha is satisfied at the current score. Idempotent.

#### Returns

`void`

***

### press() {#press}

> **press**(`action`): `void`

Inject a live input (touch buttons, gamepad, custom). No-op in headless
(there the trace drives input). Call ONLY from live event handlers, never
from the sim (`onFixedUpdate`). Keyboard is wired automatically from
[KaplayGameOptions.keys](Interface.KaplayGameOptions.md#keys).

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

Live counterpart to [press](#press). No-op in headless.

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

***

### shuffled() {#shuffled}

> **shuffled**\<`T`\>(`arr`): `T`[]

Seeded Fisher-Yates shuffle (does not mutate the input) on the `k.rand` rail. KAPLAY's own `shuffle` is also seeded now; this just keeps the pick on the primary rail.

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
