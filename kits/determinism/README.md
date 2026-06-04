# @caputchin/determinism

Make a JS environment behave deterministically, so the **same code produces the
same result in the browser and on the server**. This is the shared determinism
primitive the Caputchin replay presets build on: a game library bundled into a
preset can compute its physics/math bit-for-bit identically in live play and in
the headless server replay.

It is a focused primitive, not a game-authoring model: no reducer, no contract,
no engine. You depend on it to make the *environment* deterministic, then pair it
with a fixed-step seeded loop for full determinism.

## What it provides

- **`capMath`** - deterministic transcendentals (`sin`, `cos`, `tan`, `asin`,
  `acos`, `atan`, `atan2`, `exp`, `log`, `pow`, `hypot`, `cbrt`, hyperbolics).
  fdlibm-derived kernels built only from operations that are bit-identical across
  V8 / JSC / SpiderMonkey and CPU architectures (`+ - * /`, `Math.sqrt`, bit
  surgery). The native `Math.sin`/`cos`/`pow`/... are libm-approximated and
  diverge between a player's ARM device and an x86-64 server, which would reject
  honest players; these do not.
- **`swapMath(scope?)`** - swap the engine-visible `Math.*` transcendentals to
  `capMath`, so even a bundled engine that calls `Math.sin(...)` directly becomes
  deterministic. Leaves the IEEE-754-mandated members (`sqrt`/`abs`/`floor`/...)
  intact (they are already deterministic). It does NOT neutralize wall-clock /
  entropy / IO globals; a framework engine needs `requestAnimationFrame` /
  `performance` / `navigator` to run.
- **`makeDeterministic(scope?)`** - the single composition point. Today it is
  `swapMath`; future deterministic stubs (a seeded clock, env-safe RNG) join here.

## Usage

```ts
import { makeDeterministic } from '@caputchin/determinism';

// Once, before the bundled engine runs (same call live and on replay):
makeDeterministic(globalThis);
```

Or call the deterministic math directly instead of `Math`:

```ts
import { capMath } from '@caputchin/determinism';
const a = capMath.atan2(dy, dx); // bit-identical everywhere
```

## The determinism rule

Float `+ - * /` and `Math.sqrt`/`abs`/`floor`/`round` are IEEE-754 correctly
rounded, so they are deterministic by default. The transcendentals are not, which
is the gap this kit closes. Pair the Math swap with a deterministic loop (fixed
timestep, seeded RNG, no wall clock in the sim) and the whole environment is
reproducible.
