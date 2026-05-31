# Variable: SHIM\_VERSION

> `const` **SHIM\_VERSION**: `string` = `pkg.version`

Version of the kit's deterministic execution environment. Equals the
package version: `cap.rng`, `cap.math`, and the neutralization shim are
released together as one atomic environment, so any behavioral change to any
of them produces a new `SHIM_VERSION`. The trace codec stamps this value so
a recorded run can be matched to the environment that produced it. Sourced
from `package.json` so it cannot drift from the published package version.
