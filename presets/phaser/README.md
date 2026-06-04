# @caputchin/preset-phaser

Run a headless [Phaser 4](https://phaser.io) game as a Caputchin deterministic-replay sim. Phaser itself is the server `run` (the engine is the sim, not a hand-rolled stand-in): the same scene logic renders in the player's browser and re-executes on the server isolate over the recorded trace.

This preset depends on no shared replay kit. Phaser boots headless via its own `headlessStep`, gameplay randomness comes from `Phaser.Math.RandomDataGenerator` seeded from the platform seed, and a small boot shim supplies the deterministic stubs Phaser needs inside the sealed isolate (no DOM, frozen clock, codegen disabled).

## Install

```sh
pnpm add @caputchin/preset-phaser @caputchin/game-sdk phaser
```

`phaser` is a peer dependency: you pin the Phaser version your game targets (`^4.1`).

## The one rule: import the shim first in your run entry

Phaser reads `window` and `Image` while its module evaluates, not only at `new Phaser.Game(...)`. So the headless shim must be installed before phaser is imported. In your replay entry, make `@caputchin/preset-phaser/install` the **first** import, before anything that pulls phaser:

```ts
// src/run.ts (the headless replay entry)
import '@caputchin/preset-phaser/install'; // MUST be first
import { makePhaserRun } from '@caputchin/preset-phaser';
import { volleySim, decode } from './sim.js'; // imports phaser

export const run = makePhaserRun({
  width: 640,
  height: 400,
  maxTicks: 60 * 60, // hard ceiling (~60s at 60Hz)
  decode,
  sim: volleySim, // ({ seed, config, currentTick, currentAction, rng }) => hooks
});
```

`makePhaserRun` returns a conforming `run(seed, config, trace) => Verdict`. Do not import `/install` in your live (browser) build: the real DOM is present there.

## Sharing one scene across live and replay

Write the sim hooks (`create` / `update` / `result` / optional `isOver`) once and use them in both entries. The live entry records the player's per-tick action into the trace and renders with Phaser as usual; the replay entry feeds the recorded actions back through the same hooks. Seed all gameplay randomness with `seedFromPlatform(seed)` so both sides draw the identical sequence.

```ts
// src/index.ts (the live entry)
import { register } from '@caputchin/game-sdk';
import { seedFromPlatform } from '@caputchin/preset-phaser';
// ... live Phaser game, render + input capture, bridge.pass({ trace }) on win
```

## Build

```ts
// tsup.config.ts
import { defineConfig } from 'tsup';
import { definePhaserBuild } from '@caputchin/preset-phaser/build';

export default defineConfig(definePhaserBuild({ gameId: 'volley' }));
```

This emits a minified IIFE live bundle (`dist/volley.js`, phaser and assets inlined for the iframe CSP) and a minified ESM headless bundle (`dist/run.js`) for the replay isolate.

## Determinism

The sim must be reproducible bit-for-bit across the browser and the server isolate. Keep gameplay math integer or fixed-point, avoid native trig (`Math.sin` and friends diverge across CPUs; reflect by flipping velocity components instead), and take all randomness from `seedFromPlatform`. The shim freezes the clock and seeds Phaser's internal `Math.random`, matching the isolate. Verify before publish with `caputchin-selfcheck dist/run.js`.

## API

| Export | Purpose |
|---|---|
| `@caputchin/preset-phaser/install` | side-effect import that installs the headless shim at module load |
| `makePhaserRun(opts)` | build the conforming `run` from your sim hooks |
| `seedFromPlatform(seed)` | a `Phaser.Math.RandomDataGenerator` seeded from the platform seed |
| `bootHeadlessPhaser(config)` | boot a `Phaser.HEADLESS` game and resolve when ready (advanced) |
| `applyPhaserShim(seed?)` | install the shim manually (advanced) |
| `@caputchin/preset-phaser/build` `definePhaserBuild(opts)` | the dual live + headless tsup config |
