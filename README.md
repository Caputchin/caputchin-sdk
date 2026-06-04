# caputchin-sdk

Monorepo for the `@caputchin` JavaScript, TypeScript, and Rust client libraries. The workspace is split into three groups: shipped **packages** that integrators and game authors consume directly, lower-level **kits** that the replay tooling is built from, and per-engine **presets** that bring a specific game engine onto the deterministic-replay platform.

## Packages

End-user libraries (`packages/*`).

| Package | Description |
|---|---|
| [`@caputchin/widget`](packages/widget) | Customer-facing CAPTCHA and game web component (`<caputchin-widget>`) |
| [`@caputchin/game-sdk`](packages/game-sdk) | `register()` helper and TypeScript types for game authors |
| [`@caputchin/mcp`](packages/mcp) | stdio MCP server for managing Caputchin resources via AI agents |
| [`@caputchin/replay-contract`](packages/replay-contract) | The mandatory `run(seed, config, trace)` contract for server-validated game replay |

## Kits

Authoring building blocks the presets and replay artifacts are built from (`kits/*`).

| Package | Description |
|---|---|
| [`@caputchin/determinism`](kits/determinism) | Determinism primitives: deterministic transcendental math (fdlibm), the seeded RNG, the Math swap, and the ambient-surface ban shim |
| [`@caputchin/engine-kit`](kits/engine-kit) | Optional authoring kit: the reducer-to-run adapter (fixed-step replay loop + default trace codec) for replay-conforming games |
| [`@caputchin/replay-selfcheck`](kits/replay-selfcheck) | The shared replay determinism + smoke check (the `caputchin-selfcheck` CLI plus the platform replay-isolate prober) |
| [`@caputchin/replay-wasm`](kits/replay-wasm) | Host glue for a headless WASM replay artifact: precompiled-module instantiation, C-ABI linear-memory marshalling, and gzip+base64 inline decode |
| [`caputchin-replay-rs`](kits/replay-rs) | Rust authoring crate: turns a deterministic sim into the C-ABI a headless WASM replay artifact exports |

## Presets

Per-engine on-ramps for running a game headless and deterministically on the replay platform (`presets/*`). See [`presets/README.md`](presets/README.md) for the full rationale.

| Preset | Description |
|---|---|
| [`@caputchin/preset-kaplay`](presets/kaplay) | KAPLAY on-ramp: headless boot, fixed-step pump, deterministic RNG rail, and the conforming run/live adapters |
| [`@caputchin/preset-melonjs`](presets/melonjs) | melonJS framework-as-sim on-ramp with the `defineMelonEngine` adapter |
| [`@caputchin/preset-phaser`](presets/phaser) | Headless Phaser 4 on-ramp: boot shim, seeded RNG, fixed-step `headlessStep` driver, and build preset |
| [`bevy/`](presets/bevy) | `cargo-generate` template for a Bevy (Rust to WASM) game; a scaffold, not a published package (excluded from the pnpm workspace) |

## Documentation

Every package and kit documents itself in-repo. Each ships its own `README.md` plus a generated API reference committed under its `docs/` directory, so the reference is browsable straight from this repository on GitHub. Start with the surface you are integrating:

| Surface | Overview | API reference |
|---|---|---|
| Widget | [`packages/widget`](packages/widget) | [reference](packages/widget/docs/README.md) |
| Game SDK | [`packages/game-sdk`](packages/game-sdk) | [reference](packages/game-sdk/docs/README.md) |
| MCP server | [`packages/mcp`](packages/mcp) | [reference](packages/mcp/docs/README.md) |
| Replay contract | [`packages/replay-contract`](packages/replay-contract) | [reference](packages/replay-contract/docs/README.md) |
| Determinism kit | [`kits/determinism`](kits/determinism) | [reference](kits/determinism/docs/README.md) |
| Engine kit | [`kits/engine-kit`](kits/engine-kit) | [reference](kits/engine-kit/docs/README.md) |
| Replay self-check kit | [`kits/replay-selfcheck`](kits/replay-selfcheck) | [reference](kits/replay-selfcheck/docs/README.md) |
| WASM host glue | [`kits/replay-wasm`](kits/replay-wasm) | [reference](kits/replay-wasm/docs/README.md) |
| Rust replay crate | [`kits/replay-rs`](kits/replay-rs) | [crate README](kits/replay-rs/README.md) |

Per-engine preset guides live in each preset's own `README.md` (linked from the Presets table above). Contributor setup and workflow: [CONTRIBUTING.md](CONTRIBUTING.md). Trademark and naming policy: [TRADEMARK.md](TRADEMARK.md).

## Requirements

- Node.js LTS (20+)
- pnpm 10+
- A Rust toolchain (only for the `replay-rs` crate and the `bevy` preset)

## Install

```sh
corepack enable
pnpm install
```

## Build all packages

```sh
pnpm -r build
```

## Run tests

```sh
# All packages
pnpm -r test

# Single package
pnpm --filter @caputchin/widget test
```

## Coverage

```sh
pnpm --filter @caputchin/widget coverage
```

## Commit conventions

Single-line [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <subject>`.

Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
Scopes: `widget`, `game-sdk`, `mcp`, `replay-contract`, `determinism`, `engine-kit`, `replay-selfcheck`, `replay-wasm`, `replay-rs`, `preset-*`, `docs`, `ci`, `deps`.

## License

Apache-2.0. See [LICENSE](LICENSE).
