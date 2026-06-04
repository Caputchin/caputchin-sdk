# @caputchin/preset-melonjs

The per-engine on-ramp for bringing a [melonJS](https://melonjs.org) game onto the [Caputchin](https://caputchin.com) deterministic-replay platform.

Caputchin runs a deterministic-replay captcha: your game records an input trace in the browser, the server re-runs the same simulation over that trace, and only the replayed verdict is trusted. melonJS is a coupled engine (its loop, physics, audio, and timers assume a browser), so running it headless and bit-for-bit deterministic on the server takes engine-specific care. This preset packages that care as tested, version-pinned code so you do not have to reverse-engineer it.

It is the framework-as-sim lane on-ramp; the shared mechanism it builds on splits across two kits: the fixed-step replay loop and `run` adapter live in [`@caputchin/engine-kit`](https://www.npmjs.com/package/@caputchin/engine-kit), the deterministic primitives and trap in [`@caputchin/determinism`](https://www.npmjs.com/package/@caputchin/determinism). This preset re-exports both, so a melonJS author has a single import site.

## Install

```sh
npm install @caputchin/preset-melonjs melonjs
```

`melonjs` is a peer dependency: your game pins and bundles its own copy, and the preset is tested against melonJS 19.

The full generated API reference for every export lives in [`docs/`](docs/README.md).

## The one rule: import the determinism layer first

melonJS pulls in polyfills (core-js) that read `Math.random()` while their module *evaluates*, not only when your game runs. The server replay isolate bans ambient `Math.random` (a read throws), so the determinism layer must be installed BEFORE melonJS is imported, or the artifact never loads and the game self-rejects every player.

In your **headless replay entry**, make `@caputchin/preset-melonjs/install` the **first** import, before anything that pulls melonJS. It seeds `Math.random` (so the eval-time read is deterministic, not a throw), swaps the transcendental Math kernels, and installs the headless DOM shim + frozen clock:

```ts
// run.ts - the conforming replay artifact (caputchin.json `run.entry` pins it).
import '@caputchin/preset-melonjs/install'; // MUST be first
import * as me from 'melonjs';
import { defineMelonGame, toRun, type MelonGameSpec } from '@caputchin/preset-melonjs';
```

In your **live (browser) entry**, make `@caputchin/preset-melonjs/live` the **first** import. It applies the SAME transcendental Math swap (so the player's browser and the server isolate compute identical floats) but keeps the real DOM and clock:

```ts
// game.ts - the live entry
import '@caputchin/preset-melonjs/live'; // MUST be first
import * as me from 'melonjs';
```

Both are side-effect imports (no bindings). Never import `/install` in the browser build (it stubs the DOM) or `/live` in the headless build.

## The headless sim (the part the server replays)

Write your game as a `MelonGameSpec` and wrap it with `defineMelonGame` + `toRun`. The preset boots a headless `me.Application` and drives `world.update` at a fixed step under the determinism trap; you build the scene and read the state back. The same spec runs the browser round and the server replay, so the live score equals the replayed verdict by construction.

```ts
import '@caputchin/preset-melonjs/install'; // MUST be first
import * as me from 'melonjs';
import { defineMelonGame, toRun, type MelonGameSpec } from '@caputchin/preset-melonjs';

interface State { /* serializable game state */ }
type Action = { /* one player input */ };

const spec: MelonGameSpec<State, Action> = {
  me,
  width: 256,
  height: 256,
  setup(api) {
    // Build your melonJS physics scene (me.Body bodies, collision shapes) into
    // api.app.world; stash live refs in api.ctx; return the serializable State.
    // Seed ALL gameplay randomness from api.rng (NOT Math.random).
    return { /* ... */ } as State;
  },
  input(state, action, api) { /* apply one player input */ return state; },
  afterStep(state, api) {
    // The preset already advanced the physics (world.update) under the trap;
    // read engine state (positions, collisions, score) back into State here.
    return state;
  },
  isOver(state) { return /* round ended? */ false; },
  result(state) { return { score: 0, passed: false }; },
};

export const run = toRun(defineMelonGame(spec), { maxTicks: 2000 });
```

`defineMelonGame` does the engine-specific work for you:

- boots a headless `me.Application` (CANVAS renderer, no GL); with `/install` it runs against the headless DOM shim + frozen clock in the replay isolate, while the browser keeps the real DOM;
- runs every fixed step's `world.update` inside a determinism trap that feeds melonJS internals a seeded `Math.random` and a fixed tick-clock, restoring the real globals afterward, so live and replay never diverge;
- draws the trap's randomness from a stream independent of your `api.rng`, so a melonJS version that changes how often it calls `Math.random` internally cannot shift your game's own randomness.

## Determinism rules (non-negotiable)

The browser and the server must agree bit-for-bit, so inside your `setup`/`input`/`afterStep`:

- keep the verdict-determining state integer or fixed-point (grid cells, integer sub-steps); do not let engine float physics decide the outcome;
- draw all game randomness from `api.rng`, never `Math.random` or `me.Math.random`;
- never read the clock, the network, or any host state;
- collide with melonJS `getBounds().overlaps(...)` or integer cell tests, not floating tween positions.

Get this wrong and your game false-rejects its own players. The preset's determinism trap is your safety net for melonJS internals, not a license to use nondeterminism in your own logic.

Verify before you publish with `caputchin-selfcheck dist/run.js` (the CLI re-exported by [`@caputchin/engine-kit`](https://www.npmjs.com/package/@caputchin/engine-kit)): it runs the same determinism probe the platform runs at vendor time, so a non-conforming run fails on your machine instead of silently in production.

## The live (browser) render

The headless sim above has no pixels. Your playable game is an idiomatic melonJS app that drives the SAME spec with `createMelonDriver` and records the same trace your sim replays:

```ts
import '@caputchin/preset-melonjs/live'; // MUST be first
import * as me from 'melonjs';
import { createMelonDriver, encodeTrace } from '@caputchin/preset-melonjs';
```

1. `me.video.init(...)` against your container, with a responsive scale method so the canvas fills its parent on both axes.
2. `createMelonDriver(spec, app, { seed, config })` returns the same fixed-step driver the server replays; run it from a manual loop (the preset trap-wraps each `world.update`), recording each input tick-stamped with `encodeTrace`.
3. On pass / round end, forward the recorded trace to `bridge.pass({ trace })` via [`@caputchin/game-sdk`](https://www.npmjs.com/package/@caputchin/game-sdk).

Caputchin's first-party **DotRunner** game is the complete, open-source worked example of this live path on melonJS.

## API

| Export | Purpose |
|---|---|
| `@caputchin/preset-melonjs/install` | side-effect import (headless): seeds `Math.random`, swaps Math, installs the DOM shim + frozen clock at module load, before melonJS evaluates. First import in the run entry. |
| `@caputchin/preset-melonjs/live` | side-effect import (browser): the Math swap only, for browser/server float parity. First import in the live entry. |
| `defineMelonGame(spec)` | adapt a `MelonGameSpec` into the headless `run` engine (pair with `toRun`). |
| `createMelonDriver(spec, app, setup)` | the shared fixed-step driver, for the live mount. |
| `toRun(engine, { maxTicks })` | build the conforming `run(seed, config, trace) => Verdict`. |

## What this builds on

- [`@caputchin/determinism`](https://www.npmjs.com/package/@caputchin/determinism) - the shared determinism layer every framework preset reuses: the seeded `rng` / deterministic `capMath` primitives, the `withDeterministicEnv` trap (seeded `Math.random`, deterministic transcendental math, fixed clock), and the headless DOM shim. The preset re-exports `rng` / `rngFromState` / `capMath` so your game needs no direct dependency on it.
- [`@caputchin/engine-kit`](https://www.npmjs.com/package/@caputchin/engine-kit) - the fixed-step replay loop, the `toRun` adapter, and the `caputchin-selfcheck` CLI.
- [`@caputchin/replay-contract`](https://www.npmjs.com/package/@caputchin/replay-contract) - the `run` / `Seed` / `Verdict` shapes.
