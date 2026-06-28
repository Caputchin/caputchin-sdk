# Engine presets

You can write a game from scratch with `register` + a hand-rolled `run`, but for
a real game engine use a preset. A preset is a per-engine on-ramp that does the
hard part: booting the engine headless on the server, installing the determinism
rails, and giving you a matching live driver and conforming `run`. The shared
machinery (determinism primitives, WASM host glue, the replay contract) lives in
the kits and packages the presets build on.

## Pick by engine

| Engine | Preset | Shape | Notes |
| --- | --- | --- | --- |
| KAPLAY | `@caputchin/preset-kaplay` | npm package | Headless boot, fixed-step pump, deterministic RNG rail, conforming run/live adapters. |
| Phaser 4 | `@caputchin/preset-phaser` | npm package | Headless boot shim, seeded RNG, fixed-step `headlessStep` driver, build preset. |
| melonJS | `@caputchin/preset-melonjs` | npm package | Framework-as-sim on-ramp via the `defineMelonGame` adapter. |
| Excalibur | `@caputchin/preset-excalibur` | npm package | Excalibur on-ramp (TypeScript engine). |
| Bevy (Rust to WASM) | `presets/bevy` | `cargo-generate` template | Headless replay scaffold, build pipeline, SDK wiring, plus a guide for a Bevy WebGL render. |
| Rapier3d (physics) | `presets/rapier` | `cargo-generate` template | One WASM exposing both the headless replay and live stepping C-ABIs; the browser drives it with the `LiveSim` driver from `@caputchin/replay-wasm` plus your renderer. |

The npm presets install like any dependency. The two Rust templates are scaffolds
(not published packages), generated with `cargo-generate`:

```sh
cargo generate --git https://github.com/Caputchin/caputchin-sdk presets/bevy --name my-game
cargo generate --git https://github.com/Caputchin/caputchin-sdk presets/rapier --name my-game
```

## How a preset fits the contract

Every preset, JS or Rust, exists to satisfy the same thing from
[determinism-replay.md](determinism-replay.md): a live play side and a server
replay side that agree on the verdict for a given `(seed, config, trace)`. A
preset gives you:

- a **live driver** for the browser (real clock and rendering kept), and
- a **headless / replay path** that boots the engine under the hostile isolate
  (no clock, no `Math.random`, deterministic math), driven by fixed steps.

Both run the same simulation logic, so the verdict matches. You write the game;
the preset keeps the two sides in lockstep.

## Choosing

- Already know an engine here? Use its preset; it is the fastest correct path.
- Pure 2D, no engine attachment? The from-scratch shape in the parent SKILL plus
  `@caputchin/engine-kit` (the reducer-to-run adapter) is lighter than pulling in
  a full engine.
- Physics or 3D, comfortable in Rust? The `rapier` or `bevy` template gives you a
  WASM sim that is deterministic by construction.

Whatever you pick, the self-check is still the gate: run `caputchin-selfcheck`
before shipping (see [determinism-replay.md](determinism-replay.md)).

## Learn more

- Presets overview: https://github.com/Caputchin/caputchin-sdk/tree/main/presets
- Customer docs portal (game engine presets guide): https://docs.caputchin.com
