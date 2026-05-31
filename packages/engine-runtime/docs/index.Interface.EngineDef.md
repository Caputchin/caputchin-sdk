# Interface: EngineDef\<S, A, C, V\>

The pure reducer the kit drives. `S` = engine state (must be
plain-serializable), `A` = the author's action type, `C` = config shape.

Contract:
- `init` resolves the RAW config (`null` -> the engine's defaults) into its
  internal sim parameters and builds the initial state from the seed. Seed the
  PRNG here via `cap.rng(setup.seed)` and keep it in state; never read
  randomness later from anywhere else.
- `step` applies one player action (at its logical tick).
- `tick` advances exactly one fixed timestep.
- `isOver` reports whether the game has ended.
- `result` reads the final score AND the pass decision off the terminal state.

All five MUST be pure and synchronous: no Date / Math.random / crypto / fetch
/ DOM / async. Use `cap.rng` for randomness and `cap.math` for transcendental
math (the shim also swaps `Math.*`, but importing `cap.math` is clearer).

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `S` | - |
| `A` | `unknown` |
| `C` | `unknown` |
| `V` | `S` |

## Methods

### init() {#init}

> **init**(`setup`): `S`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `setup` | [`EngineSetup`](index.Interface.EngineSetup.md)\<`C`\> |

#### Returns

`S`

***

### isOver() {#isover}

> **isOver**(`state`): `boolean`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | `S` |

#### Returns

`boolean`

***

### result() {#result}

> **result**(`state`): [`Result`](index.Interface.Result.md)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | `S` |

#### Returns

[`Result`](index.Interface.Result.md)

***

### step() {#step}

> **step**(`state`, `action`): `S`

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

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | `S` |

#### Returns

`S`

***

### view()? {#view}

> `optional` **view**(`state`): `V`

OPTIONAL render projection. The live driver hands the renderer the result
of `view(state)` each tick if defined, otherwise the full state `S`. Provide
it to keep engine internals (the PRNG state, AI bookkeeping, spatial
indexes) out of what crosses the worker boundary and reaches the DOM layer;
omit it and the renderer receives the whole state. Pure and synchronous like
the rest of the contract; it never feeds replay (the server runs
`init/step/tick/result` only), so it cannot affect the verdict.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | `S` |

#### Returns

`V`
