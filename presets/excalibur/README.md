# @caputchin/preset-excalibur

The on-ramp for an [Excalibur.js](https://excaliburjs.com) game on the
[Caputchin](https://caputchin.com) deterministic-replay platform.

Caputchin runs a replay captcha: your game records an input trace in the browser,
and the server re-runs the same simulation over that trace and trusts only the
replayed verdict. Excalibur has no headless mode, so this preset makes it run
headless (a DOM shim on Excalibur's 2D-canvas path) AND deterministic: it advances
the engine at a fixed timestep (the same fixed-dt ticks in the browser and on the
server), seeds the gameplay RNG from the round seed, and makes `Math`
transcendentals deterministic. You write the game once against a small per-tick
api; it runs live in the browser and re-runs on the server. You give it the
conforming `run`.

The input model is **pointer-first** (a rich-gesture channel: down / move / up
with world coordinates), with an optional named-action channel. This makes it a
good fit for gesture games (slash / drag / draw); discrete-button games can use
the action channel.

Dependencies: the mandatory `@caputchin/replay-contract` and the shared
`@caputchin/determinism` kit (the deterministic Math + seeded RNG).

## Install

```sh
pnpm add @caputchin/preset-excalibur @caputchin/game-sdk excalibur
```

`excalibur` and `@caputchin/game-sdk` are peer dependencies. Pin the exact
`excalibur` version the preset is built against (its determinism is
version-specific).

## Write your game once

```ts
// src/game.ts
import { defineExcaliburGame } from '@caputchin/preset-excalibur';

export const game = defineExcaliburGame(
  (engine, api) => {
    // Render-only setup is skipped on the server with `if (!api.headless)`.
    // (v0.1 is procedural: draw with Excalibur graphics primitives, no asset files.)

    // The sim lives in api.onTick - called once per fixed tick, AFTER this tick's
    // input is applied, on BOTH ends. Read input via the api, randomness via the
    // api's seeded rand*. Never read engine.input, Date, Math.random, or fetch.
    let score = 0;
    api.onTick(() => {
      for (const ev of api.pointer.events) {
        // ev = { kind: 0|1|2 (down/move/up), x, y } in fixed world space.
        if (ev.kind === 0 && hitTarget(ev.x, ev.y)) score += 1;
      }
      api.setScore(score);
      if (score >= readPassScore(api.ctx)) {
        api.pass();
        api.gameOver(); // pass implies the round is over; the pump stops here
      }
      if (api.tick > timeBudgetTicks(api.ctx)) api.gameOver(); // time's up = fail
    });
  },
  {
    width: 800, // the fixed world the sim reasons in (pointer coords are in this space)
    height: 600,
    maxTicks: 60 * 50, // reject runs longer than ~60s (50 ticks/s)
    // actions: ['left', 'right'], // optional discrete channel (index is the wire code: APPEND, never reorder)
  },
);
```

## The two entries

```ts
// src/run.ts  -> caputchin.json `run.entry` (the headless replay artifact)
import '@caputchin/preset-excalibur/install'; // MUST be first - shims the DOM before excalibur evaluates
import { excaliburRun } from '@caputchin/preset-excalibur';
import { game } from './game.js';
export const run = excaliburRun(game);
```

```ts
// src/index.ts -> caputchin.json `entry` (the playable browser game)
import { register } from '@caputchin/game-sdk';
import { mountExcaliburGame } from '@caputchin/preset-excalibur';
import { game } from './game.js';
register((container, bridge, ctx) => mountExcaliburGame(game, { container, bridge, ctx }));
```

The live mount runs Excalibur on its normal (WebGL) renderer, sized to the
container with `DisplayMode.FitContainer`; the headless replay runs the 2D-canvas
path with rendering disabled. Bundle both into the iframe artifact (Excalibur
included) with your bundler; there is no runtime CDN fetch under the game CSP.

## `caputchin.json`

Excalibur is pure JavaScript, so the replay artifact is a single entry, no
`run.modules`:

```json
{
  "entry": "dist/<game>.js",
  "run": { "entry": "dist/run.js" },
  "preferred": { "width": 320, "height": 480 }
}
```

## The api

Read these each tick inside `api.onTick`:

- **`api.pointer`** - `{ isDown, x, y, events }`. `events` is the pointer edges
  that landed THIS tick (a run of them is a slash / drag) in fixed world space -
  the rich-gesture channel the input-signature judge scores.
- **`api.isDown / justPressed / justReleased(action)`** - the optional named-action
  channel (declare `options.actions`; bind keyboard yourself and call
  `api.press` / `api.release` from live handlers).
- **`api.rand / randi / randiRange / chance / choose`** - the seeded RNG (sfc32,
  seeded from the round seed). The ONLY randomness source; reproduces both ends.
- **`api.setScore / pass / gameOver`** - the verdict. `pass()` latches the captcha;
  `gameOver()` ends the round (call it when you pass, fail, or run out of time).
- **`api.announce(msg)`** - polite ARIA announcement (live only).
- **`api.ctx`** - `{ seed, config, locale, skin }`. Read gate-affecting params
  (pass threshold, difficulty) from `config`, never from input.
- **`api.headless`** - true on the server; guard render-only setup with it.

## The few rules

- **Input only through `api`** (pointer + named actions), never `engine.input`.
  This is the one thing the preset records and replays.
- **Randomness only through `api.rand*`.** Never `Math.random()` in the sim.
- **No wall clock, no network.** Never read `Date`, `performance.now`, `crypto`,
  or `fetch` in the sim - those stay non-deterministic.
- **The sim must self-terminate.** Call `api.gameOver()` when the round ends
  (pass / fail / time budget). A run that never ends hits `maxTicks` and is
  rejected (truncated = fail).
- **Author the sim in world space.** Keep a static camera (the live mount defaults
  it so world `(0,0)` is the top-left and `(width,height)` the bottom-right) so the
  pointer coordinates the preset records match the space the sim reasons in.

Get this wrong and your game false-rejects its own players. There is no
index-time determinism gate, only a conformance smoke test, so verify locally
(e.g. `@caputchin/replay-selfcheck`).

## What the preset handles for you

- Headless Excalibur boot under an isolated DOM shim (2D-canvas path, no WebGL),
  and the fixed-step `TestClock` pump that drives the loop on the server.
- Seeding the gameplay RNG from the round seed + deterministic `Math`.
- Recording pointer + action input tick-stamped in the browser and replaying it at
  the same ticks on the server (the trace codec).
- The `run(seed, config, trace) -> verdict` contract, including a failing verdict
  for a malformed trace and rejection of a non-terminating run.

## Builds on

- [`@caputchin/replay-contract`](https://www.npmjs.com/package/@caputchin/replay-contract) - the `run` / `Seed` / `Verdict` shapes.
- [`@caputchin/determinism`](https://www.npmjs.com/package/@caputchin/determinism) - the deterministic Math + seeded RNG.
- [`@caputchin/game-sdk`](https://www.npmjs.com/package/@caputchin/game-sdk) - the widget `register` surface and `ctx`.
- [`excalibur`](https://excaliburjs.com) - the game engine itself.
```
