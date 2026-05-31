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

Build the initial engine state from `setup.seed` and `setup.config`.
This is the ONLY place raw config is resolved to sim parameters; call
`cap.rng(setup.seed)` here and keep the `Rng` in state.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `setup` | [`EngineSetup`](Interface.EngineSetup.md)\<`C`\> |

#### Returns

`S`

***

### isOver() {#isover}

> **isOver**(`state`): `boolean`

Returns `true` when the game has ended and the replay loop should stop.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `state` | `S` | Current engine state. |

#### Returns

`boolean`

***

### result() {#result}

> **result**(`state`): [`Result`](Interface.Result.md)

Read the final score and pass decision from the terminal state. Called
once after [isOver](#isover) returns `true`. Must be pure.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `state` | `S` | Terminal engine state. |

#### Returns

[`Result`](Interface.Result.md)

***

### step() {#step}

> **step**(`state`, `action`): `S`

Apply one player action at its logical tick. Must be pure and synchronous.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `state` | `S` | Current engine state. |
| `action` | `A` | Player action to apply. |

#### Returns

`S`

***

### tick() {#tick}

> **tick**(`state`): `S`

Advance the simulation by exactly one fixed timestep (`FIXED_TIMESTEP_MS`).
Must be pure and synchronous.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `state` | `S` | Current engine state. |

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
