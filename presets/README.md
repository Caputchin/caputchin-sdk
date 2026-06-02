# Caputchin engine presets

Per-engine on-ramps for bringing a game engine onto the [Caputchin](https://caputchin.com) deterministic-replay platform. Each engine gets its own reusable scaffold here, built once for every third-party author who wants that engine. The shared mechanism the presets depend on (deterministic primitives, the WASM host glue, the replay contract) lives in [`../kits`](../kits) and [`../packages`](../packages).

## Contents

- [`bevy/`](bevy/) - a `cargo-generate` template for a Bevy (Rust to WASM) game: the headless replay scaffold, the build pipeline, the SDK wiring, and a guide for adding a Bevy WebGL render. Generate with:

  ```sh
  cargo generate --git https://github.com/Caputchin/caputchin-sdk presets/bevy --name my-game
  ```

As more engines are integrated, each lands here either as a `cargo-generate` template (like `bevy/`) or as a published `@caputchin/preset-<engine>` npm package, depending on the engine's integration shape.
