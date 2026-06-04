# Caputchin engine presets

Per-engine on-ramps for bringing a game engine onto the [Caputchin](https://caputchin.com) deterministic-replay platform. Each engine gets its own reusable scaffold here, built once for every third-party author who wants that engine. The shared mechanism the presets depend on (deterministic primitives, the WASM host glue, the replay contract) lives in [`../kits`](../kits) and [`../packages`](../packages).

## Contents

- [`bevy/`](bevy/) - a `cargo-generate` template for a Bevy (Rust to WASM) game: the headless replay scaffold, the build pipeline, the SDK wiring, and a guide for adding a Bevy WebGL render. Generate with:

  ```sh
  cargo generate --git https://github.com/Caputchin/caputchin-sdk presets/bevy --name my-game
  ```

- [`rapier/`](rapier/) - a `cargo-generate` template for a rapier3d (renderer + WASM physics) game: ONE wasm exposing both the headless replay (`caputchin_replay!`) and the live stepping (`caputchin_live!`) C-ABIs, the build pipeline, and the SDK wiring. The browser side drives it with the `LiveSim` live-driver from [`@caputchin/replay-wasm`](../kits/replay-wasm/) plus the renderer of your choice. Generate with:

  ```sh
  cargo generate --git https://github.com/Caputchin/caputchin-sdk presets/rapier --name my-game
  ```

As more engines are integrated, each lands here either as a `cargo-generate` template (like `bevy/`) or as a published `@caputchin/preset-<engine>` npm package, depending on the engine's integration shape.
