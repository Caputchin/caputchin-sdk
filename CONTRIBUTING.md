# Contributing

## Setup

```sh
git clone https://github.com/Caputchin/caputchin-sdk.git
cd caputchin-sdk
corepack enable
pnpm install
```

## Build

```sh
# All packages
pnpm -r build

# Single package
pnpm --filter @caputchin/widget build
```

## Test

```sh
# All packages
pnpm -r test

# Single package with coverage
pnpm --filter @caputchin/widget coverage
```

## Typecheck

```sh
pnpm -r typecheck
```

## Commit conventions

Single-line [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <subject>` (max 100 chars, no body, no footer).

Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
Breaking changes: append `!` after the type/scope — `feat(widget)!: ...`.

## Where docs live

Canonical documentation is at [`/docs/`](../docs/), not inside this monorepo. See the [workspace CLAUDE.md](../CLAUDE.md) for contributor norms.
