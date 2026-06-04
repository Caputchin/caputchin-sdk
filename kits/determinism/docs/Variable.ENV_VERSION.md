# Variable: ENV\_VERSION

> `const` **ENV\_VERSION**: `string` = `pkg.version`

Version of the deterministic execution environment this kit defines:
`capMath`, the seeded `rng`, the `Math` swap, and the ambient-surface ban all
ship together as one atomic environment, so any behavioral change to any of
them produces a new `ENV_VERSION`. A recorded run's trace can stamp this value
to bind itself to the environment that produced it. Sourced from
`package.json` so it cannot drift from the published package version.
