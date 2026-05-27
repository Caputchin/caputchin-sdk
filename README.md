# caputchin-sdk

Monorepo for the `@caputchin` JavaScript and TypeScript client libraries. Contains three packages:

| Package | Description |
|---|---|
| [`@caputchin/widget`](packages/widget) | Customer-facing web component (`<caputchin-widget>`) |
| [`@caputchin/game-sdk`](packages/game-sdk) | `register()` helper and types for game authors |
| [`@caputchin/mcp`](packages/mcp) | MCP server for managing Caputchin resources via AI agents |
| [`@caputchin/replay-contract`](packages/replay-contract) | The mandatory `run(seed, config, trace)` contract for server-validated game replay |
| [`@caputchin/engine-runtime`](packages/engine-runtime) | Optional authoring kit (deterministic primitives, shims, `toRun` adapter) for replay-conforming games |

Full documentation lives in [`docs/`](../docs/), not inside this monorepo.

## Quick links

- [Widget integration guide](../docs/guides/integrate-widget.md)
- [Publishing a game to the marketplace](../docs/guides/publish-to-marketplace.md)
- [Widget API reference](../docs/widget.md)
- [Game SDK reference](../docs/game-sdk.md)

## Requirements

- Node.js LTS (20+)
- pnpm 10+

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
Scopes: `widget`, `sdk`, `mcp`, `infra`, `docs`, `ci`, `deps`.

## License

MIT. See [LICENSE](LICENSE).
