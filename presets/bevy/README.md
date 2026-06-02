# {{project-name}}

A [Caputchin](https://caputchin.com) replay game on the [Bevy](https://bevyengine.org) engine, generated from the Caputchin Bevy preset.

Caputchin runs a deterministic-replay captcha: your game records an input trace in the browser, and the server re-runs the same simulation over that trace and trusts only the replayed verdict. This starter gives you the headless replay artifact, the build pipeline, and the wiring to the Caputchin SDK. You add your game's simulation and (when you want pixels) your Bevy render.

## Generate

```sh
cargo generate --git https://github.com/Caputchin/caputchin-sdk presets/bevy --name my-game
```

## What you get

- `src/sim.rs` - the deterministic simulation (a starter tap game). This is the part the server re-runs.
- `src/lib.rs` - the headless build: it feeds your `sim` to the `caputchin_replay!` macro from [`caputchin-replay-rs`](https://crates.io/crates/caputchin-replay-rs), which emits the freestanding C-ABI WASM the replay host loads.
- `src/run.ts` + `src/config.ts` - the conforming `run` entry, using [`@caputchin/replay-wasm`](https://www.npmjs.com/package/@caputchin/replay-wasm) to instantiate the headless module. `config.ts` encodes the opaque server config into the i32 array your sim reads.
- `scripts/build-wasm.sh` + `tsup.config.ts` - build the headless WASM and bundle the replay entry.
- `caputchin.json` - the marketplace manifest.

## Determinism rules (non-negotiable)

The browser and the server must agree bit-for-bit, so your `sim`:

- uses integer or fixed-point math only (no `f32`/`f64` in the result-determining path);
- draws randomness only from the four-word `seed`;
- never reads the clock, the network, or any host state.

Get this wrong and your game false-rejects its own players.

## Build the headless replay artifact

```sh
pnpm install
pnpm build      # runs scripts/build-wasm.sh, then tsup
```

This produces `dist/run.js` + `dist/{{project-name}}.wasm` - a complete, replayable artifact. Edit `src/sim.rs` to make it your game.

**`pnpm build` produces only the headless replay artifact.** The marketplace `entry` in `caputchin.json` (`dist/{{project-name}}.js`, your playable browser game) is not built until you add your live render in the next section, so the game is publishable only once that render exists.

## Add your live (browser) render with Bevy

The headless artifact above has no pixels. Your playable game is a full Bevy WebGL build that records the same trace your `sim` replays. To add it:

1. Write `src/live.rs` with a `#[wasm_bindgen]` `start(...)` entry that boots a Bevy `App` (`DefaultPlugins` -> WebGL2), draws your game, records each input into the trace (the same byte format your `sim` decodes), and dispatches a finish event with the recorded trace when the round ends.
2. Uncomment the `mod live;` lines in `src/lib.rs`.
3. Write `src/index.ts` that calls `register(...)` from [`@caputchin/game-sdk`](https://www.npmjs.com/package/@caputchin/game-sdk), boots the wasm-bindgen module, mounts its canvas, and forwards the finish event's trace to `bridge.pass({ trace })`. Inline the live WASM with `inflateWasm` from `@caputchin/replay-wasm` (the iframe CSP forbids fetching it).
4. Add the live build to `scripts/build-wasm.sh` (`cargo build --features render` then `wasm-bindgen`) and a second IIFE entry to `tsup.config.ts`.

Caputchin's first-party **Wall Smash** game is the complete, open-source worked example of this live path (Bevy 2D/3D render, trace recording, the finish-event bridge); copy its `src/live.rs` and `src/game.ts` patterns.

## Publish

Push to a public GitHub repo with the `caputchin-game` topic. See the Caputchin marketplace docs for the submission flow and the support-flag checklist.

## The pieces this builds on

- [`caputchin-replay-rs`](https://crates.io/crates/caputchin-replay-rs) - the macro that turns your sim into the headless C-ABI.
- [`@caputchin/replay-wasm`](https://www.npmjs.com/package/@caputchin/replay-wasm) - the JS host glue that instantiates and marshals into it.
- [`@caputchin/replay-contract`](https://www.npmjs.com/package/@caputchin/replay-contract) - the `run` / `Seed` / `Verdict` shapes.
