# {{project-name}}

A [Caputchin](https://caputchin.com) replay game on the [rapier3d](https://rapier.rs)
physics engine, generated from the Caputchin rapier preset.

Caputchin runs a deterministic-replay captcha: your game records an input trace in
the browser, and the server re-runs the same simulation over that trace and trusts
only the replayed verdict. This starter gives you the deterministic simulation, the
build pipeline, and the wiring to the Caputchin SDK. You add your game logic and
(when you want pixels) your renderer.

## Generate

```sh
cargo generate --git https://github.com/Caputchin/caputchin-sdk presets/rapier --name my-game
```

## What you get

- `src/sim.rs` is the deterministic simulation (a starter "catch the falling orbs"
  game). This is the part the server re-runs.
- `src/lib.rs` compiles that one sim into ONE wasm that exposes both C-ABIs:
  - the headless replay (`cap_run`) via `caputchin_replay!`, the module the replay
    isolate loads;
  - the live stepping (`live_new` / `live_step` / `live_state` / `live_trace` /
    `live_free`) via `caputchin_live!`, which the browser drives frame-by-frame.
  Because it is the same wasm both ends, every float agrees by construction.
- `src/run.ts` and `src/config.ts` are the conforming `run` entry (via
  [`@caputchin/replay-wasm`](https://www.npmjs.com/package/@caputchin/replay-wasm))
  and the single config transform shared by the live and replay builds.
- `scripts/build-wasm.sh` and `tsup.config.ts` build the wasm and bundle the entry.
- `caputchin.json` and `.caputchin/configurations.json` are the marketplace manifest
  and the tunable config presets.

## Determinism rules (non-negotiable)

The browser and the server must agree bit-for-bit, so your `sim`:

- draws all randomness from the four-word seed only, never a clock or the system RNG;
- advances on a fixed tick, never wall-clock time;
- touches no DOM, no network, and no host state.

rapier3d runs in its `enhanced-determinism` mode, so the physics is cross-platform
bit-exact. Get determinism wrong and your game false-rejects its own players; use the
platform self-check before publishing.

## Build the headless replay artifact

```sh
pnpm install
pnpm build
```

This produces `dist/run.js` plus `dist/{{project-name}}.wasm`, a complete replayable
artifact. Edit `src/sim.rs` to make it your game.

## Add your live (browser) render

The headless artifact has no pixels. Your playable game steps the same wasm via its
`live_*` exports and draws the state it reads out of linear memory. The reusable
live driver, `LiveSim` (instantiate the wasm, step it, read the state words, pull
the trace), lives in
[`@caputchin/replay-wasm`](https://www.npmjs.com/package/@caputchin/replay-wasm);
pair it with the renderer of your choice (OGL, Three, Pixi). Caputchin's first-party
**Voidshot** game is the complete worked example (a rapier3d sim plus an OGL renderer
over this exact pattern). Add an `src/index.ts` that registers your game with
[`@caputchin/game-sdk`](https://www.npmjs.com/package/@caputchin/game-sdk), mounts the
renderer, and a second IIFE entry in `tsup.config.ts` whose output is the
`caputchin.json` `entry`.

## The pieces this builds on

- [`caputchin-replay-rs`](https://crates.io/crates/caputchin-replay-rs) provides the
  `caputchin_replay!` and `caputchin_live!` macros.
- [`@caputchin/replay-wasm`](https://www.npmjs.com/package/@caputchin/replay-wasm) is
  the JS host glue for the replay side.
- [`@caputchin/replay-contract`](https://www.npmjs.com/package/@caputchin/replay-contract)
  owns the `run` / `Seed` / `Verdict` shapes.
