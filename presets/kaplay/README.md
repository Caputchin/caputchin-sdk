# @caputchin/preset-kaplay

The on-ramp for a [KAPLAY](https://kaplayjs.com) game on the
[Caputchin](https://caputchin.com) deterministic-replay platform.

Caputchin runs a replay captcha: your game records an input trace in the browser,
and the server re-runs the same simulation over that trace and trusts only the
replayed verdict. KAPLAY has no headless mode, so this preset makes it run
headless (a DOM/GL shim) AND makes the **full engine deterministic**: it drives
KAPLAY at a fixed timestep (the same fixed-dt frames in the browser and on the
server) and makes `Math` transcendentals deterministic, so KAPLAY's own
`k.rand()`, physics (`body`, `area`, `move`), and `dt()` reproduce bit-for-bit
across both. You write an ordinary KAPLAY game with the full engine; it runs in
the browser and re-runs on the server. You give it the conforming `run`.

Determinism is the preset's job, not yours: write the game with the engine, not
around it.

Dependencies: the mandatory `@caputchin/replay-contract` and the shared
`@caputchin/determinism` kit (the deterministic Math). Not the engine-kit
reducer kit.

## Install

```sh
pnpm add @caputchin/preset-kaplay @caputchin/game-sdk kaplay
```

`kaplay` and `@caputchin/game-sdk` are peer dependencies. Pin the exact `kaplay`
version the preset is built against (its determinism is version-specific).

## Write your game once

```ts
// src/game.ts
import { defineKaplayGame } from '@caputchin/preset-kaplay';

export const game = defineKaplayGame(
  (k, api) => {
    // Ordinary KAPLAY, full engine. Physics (body/area/gravity), k.rand, move(),
    // dt() are all deterministic here. Render-only setup can be skipped on the
    // server with `if (!api.headless) { ... }`.
    k.setGravity(1200);
    const player = k.add([k.rect(20, 20), k.pos(100, 40), k.area(), k.body()]);

    // The sim lives in onFixedUpdate. Read INPUT as named actions (so it can be
    // recorded + replayed); everything else is plain KAPLAY.
    let score = 0;
    k.onFixedUpdate(() => {
      if (api.isDown('left')) player.move(-120, 0);
      if (api.isDown('right')) player.move(120, 0);
      if (api.justPressed('fire') && player.isGrounded()) player.jump(k.rand(300, 600));
      score += api.justPressed('fire') ? 1 : 0;
      api.setScore(score);
      if (score >= readPassScore(api.ctx)) api.pass();
      if (player.pos.y > 400) api.gameOver();
    });

    // Touch / on-screen controls inject the same named actions (live only).
    if (!api.headless) {
      addTouchButton(k, 'left', () => api.press('left'), () => api.release('left'));
    }
  },
  {
    actions: ['left', 'right', 'fire'], // index is the trace wire code: APPEND, never reorder
    keys: { left: ['left', 'a'], right: ['right', 'd'], fire: ['space'] },
    maxTicks: 60 * 50, // reject runs longer than ~60s (50 ticks/s)
    kaplay: { width: 320, height: 240, background: [12, 14, 20] },
  },
);
```

## The two entries

```ts
// src/run.ts  -> caputchin.json `run.entry` (the headless replay artifact)
import { kaplayRun } from '@caputchin/preset-kaplay';
import { game } from './game.js';
export const run = kaplayRun(game);
```

```ts
// src/index.ts -> caputchin.json `entry` (the playable browser game)
import { register } from '@caputchin/game-sdk';
import { mountKaplayGame } from '@caputchin/preset-kaplay';
import { game } from './game.js';
register((container, bridge, ctx) => mountKaplayGame(game, { container, bridge, ctx }));
```

Bundle both into the iframe artifact (KAPLAY included) with your bundler; there
is no runtime CDN fetch under the game CSP.

## `caputchin.json`

KAPLAY is pure JavaScript, so the replay artifact is a single entry, no
`run.modules`:

```json
{
  "entry": "dist/<game>.js",
  "run": { "entry": "dist/run.js" },
  "preferred": { "width": 320, "height": 480 }
}
```

## What you can use (almost everything)

The preset makes the engine deterministic, so use it normally:

- **`k.rand()` / `k.randi()` / `k.chance()` / `k.choose()`** - KAPLAY's own seeded
  RNG. The preset seeds it from the round seed and drives one fixed frame per
  tick, so it reads the same values in the browser and on the server. (The api
  also exposes `api.rand`/`randi`/`shuffled` if you prefer.)
- **`k.shuffle()` / `k.chooseMultiple()` / raw `Math.random()`** - these route
  through the host `Math.random`, which the preset ALSO seeds (a separate seeded
  stream, scoped to each frame), so they reproduce both ends too. No longer
  off-limits - the whole engine RNG surface is yours.
- **Physics** - `k.setGravity`, `body()`, `area()`, `move()`, collisions. Driven
  at a fixed `dt`, with deterministic `Math`, so it integrates identically.
- **`dt()`** - constant (the fixed timestep), so frame-rate-independent movement
  (`move(speed)`) just works.

## The few rules

- **Input only through `api`** named actions (`isDown` / `justPressed` /
  `justReleased`), never raw `k.isKeyDown(...)`. This is the one thing the preset
  must record and replay. Keyboard is wired from `options.keys`; touch/gamepad
  call `api.press` / `api.release` from live handlers.
- **No wall clock, no network.** Never read `Date`, `performance.now`, `crypto`,
  or `fetch` in the sim - those stay non-deterministic. (`Math.random` is the one
  exception: the preset seeds it, so it and KAPLAY's `shuffle()`/`chooseMultiple()`
  are safe.)
- **Load assets through `options.load`** (run before the scene starts), not lazily
  mid-game, so loading never perturbs the deterministic timeline.
- **Gate-affecting values come from `api.ctx.config`** (the server-resolved
  config), never from input.

Get this wrong and your game false-rejects its own players. There is no
index-time determinism gate, only a conformance smoke test, so verify locally.

## What the preset handles for you

- Headless KAPLAY boot under an isolated DOM/GL shim, and the fixed-step pump
  that drives the loop on the server.
- Seeding KAPLAY's RNG from the round seed.
- Recording inputs tick-stamped in the browser and replaying them at the same
  ticks on the server (the trace codec).
- The `run(seed, config, trace) -> verdict` contract, including a failing verdict
  for a malformed trace and rejection of a non-terminating run.

## Reference game

Caputchin's first-party **Blockfall** is the complete, open-source worked example
(scene, sim, touch + keyboard, locales, skins) built on this preset.

## API reference

Full API docs (generated from the source) live in [`docs/`](docs/README.md):
`defineKaplayGame`, `kaplayRun`, `mountKaplayGame`, the `KaplayGameApi`, and the
lower-level shim / pump primitives.

## Builds on

- [`@caputchin/replay-contract`](https://www.npmjs.com/package/@caputchin/replay-contract) - the `run` / `Seed` / `Verdict` shapes.
- [`@caputchin/game-sdk`](https://www.npmjs.com/package/@caputchin/game-sdk) - the widget `register` surface and `ctx`.
- [`kaplay`](https://kaplayjs.com) - the game engine itself.
