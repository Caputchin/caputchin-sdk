# @caputchin/engine-kit

The **reducer-to-run authoring lane** for Caputchin server-validated game replay.
Write your game as a pure reducer and this kit turns it into the one conforming
`run(seed, config, trace)` the platform replays. It is optional: you can ignore
it and ship a bare `run` you wrote by hand against
[`@caputchin/replay-contract`](../../packages/replay-contract).

This kit exports **only its own surface** and re-exports nothing. Install the
pieces it builds on directly, from their owners:

- the mandatory contract from [`@caputchin/replay-contract`](../../packages/replay-contract),
- the deterministic primitives (`rng`, `capMath`, the ambient ban shim) from
  [`@caputchin/determinism`](../determinism),
- the determinism self-check from [`@caputchin/replay-selfcheck`](../replay-selfcheck)
  (also shipped here as the `caputchin-selfcheck` CLI).

## What it provides

- **`defineEngine(spec)`** - declare your reducer (`init` / `step` / `tick` /
  `isOver` / `result`, plus an optional render `view`). A typed identity helper;
  it wraps nothing.
- **`toRun(engine, { maxTicks })`** - the adapter: turns the reducer into the
  conforming `run(seed, config, trace)`. This is the kit's reason to exist.
- **`replay`** - the fixed-step loop that drives both live play and the server
  replay, so live score equals replay score by construction.
- **`encodeTrace` / `decodeTrace`** - the batteries-included JSON trace codec
  (opaque to the platform; bring your own if you prefer).
- **`FIXED_TIMESTEP_MS`, `CODEC_V`** and the reducer types (`EngineDef`,
  `TickInput`, `Result`, ...).
- **`caputchin-selfcheck`** (CLI bin) - probe a built `run` artifact for
  determinism before publish: `caputchin-selfcheck dist/run.js`.

## Usage

```ts
import { defineEngine, toRun } from '@caputchin/engine-kit';
import { rng, capMath } from '@caputchin/determinism';

const engine = defineEngine<State, Action, Config>({
  init: ({ seed }) => ({ rngState: rng(seed).state, score: 0 /* ... */ }),
  step: (s, action) => ({ /* apply one input */ }),
  tick: (s) => ({ /* advance one fixed step */ }),
  isOver: (s) => s.score >= s.goal,
  result: (s) => ({ score: s.score, passed: s.score >= s.goal }),
});

// The one mandatory export the artifact ships:
export const run = toRun(engine, { maxTicks: 2000 });
```

Then, before publishing, prove it is deterministic:

```sh
caputchin-selfcheck dist/run.js
```

## Determinism is the author's burden

The kit gives you the loop and the adapter; cross-environment float determinism
is yours. Use `rng` / `capMath` from `@caputchin/determinism` for randomness and
transcendentals, keep wall-clock and `Math.random` out of the sim, and the live
run and the server replay agree bit-for-bit.
