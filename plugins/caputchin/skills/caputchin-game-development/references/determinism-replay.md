# Determinism and the replay contract

The verdict comes from the server re-running your game. This reference is how to
make that re-run agree with live play, every time.

## The run contract

A replayable game ships a JS or WASM module exporting one function under the name
`RUN_EXPORT_NAME` (from `@caputchin/replay-contract`):

```
run(seed, config, trace) -> { passed, score, durationMs }   // a Verdict
```

| Argument | What it is |
| --- | --- |
| `seed` | The server-derived per-round seed (four unsigned 32-bit words). Re-derived identically at replay. Never client-supplied. Seed all randomness from it. |
| `config` | Server-resolved gameplay config, or `null` (use the game's own defaults). Opaque to the platform. Gate-affecting values (pass threshold, lives) MUST come from here, not from the trace. |
| `trace` | The opaque player-input blob your live game emitted (`Uint8Array` or `string`). The platform never parses it; your `run` alone interprets it. |

`run` MUST be pure and deterministic across the player runtime and the server
isolate: identical `(seed, config, trace)` yields an identical verdict on both.
The verdict shape is fixed; everything else (engine, trace format, renderer) is
yours. The platform validates the returned value and treats a malformed return as
a rejected round.

## Why the server isolate is hostile

Replay runs with no real clock, `Math.random` banned, native transcendental trig
banned, and other nondeterministic IO surfaces removed. Anything that reads them
diverges from live play and fails verification. The usual offenders:

| Source of nondeterminism | Replace with |
| --- | --- |
| `Math.random()` | A seeded PRNG from `ctx.seed` (the `rng` from `@caputchin/determinism`, sfc32, bit-identical across engines). |
| `Date.now()` / `performance.now()` | Nothing time-based in gameplay logic. Drive simulation by fixed steps, not wall-clock. |
| `Math.sin/cos/tan/exp/log/pow/...` | `capMath` kernels (call `capMath.sin(...)`), which are bit-identical across CPUs and engines. The IEEE-754 members (`sqrt`, `floor`, `round`, `min`, `max`, `abs`) are already deterministic. |
| Floating-point that differs across engines | Use `capMath`, or fixed-point, or compile the sim to WASM. |

`Math.sqrt`, `Math.floor`, `Math.round`, `Math.min`, `Math.max`, `Math.abs` are
already deterministic and need no swap.

## The determinism kit

`@caputchin/determinism` gives you the primitives so you do not hand-roll them:

| Primitive | Use |
| --- | --- |
| `rng(seed)` | Seeded PRNG (sfc32, 128-bit state). Bit-identical browser and server. Resumable via `rngFromState`. |
| `capMath` | Deterministic transcendental math. `capMath.sin/cos/tan/exp/log/pow/...`. |
| `makeDeterministic(scope?)` | Prepare a scope to run deterministically (currently the Math swap); the single composition point for the deterministic environment. `scope` defaults to `globalThis`. |
| `seedRandom(seed, scope?)` | Persistently seed an engine's `Math.random` from the seed (for framework engines that read `Math.random` directly and step a fixed loop). `scope` defaults to `globalThis`. |
| `withDeterministicEnv(env, fn)` | Run `fn` with the full deterministic environment installed and restored afterward (per-step seeding for engines whose render code between steps must not consume the stream). |
| `applyHeadlessDom`, `freezeClock`, `sealHeadlessAmbient`, `applyShim` | Server / replay-side setup so a browser-targeted engine boots headless under the ban. Live play keeps the real clock and DOM; these are for the replay artifact. |

Rule of thumb: in gameplay code, use `rng(ctx.seed)` for randomness and
`capMath.*` for transcendentals, and never read the clock. Then both sides match
by construction. For a deep build (engine on the replay platform), the presets do
most of this for you, see [engine-presets.md](engine-presets.md).

## Self-check before you ship

`@caputchin/replay-selfcheck` probes a `run` for determinism by replaying it many
times under a hostile, isolate-equivalent environment and flagging any case whose
verdict is unstable or depends on a banned surface. The platform runs this at
index / upload time; a non-deterministic game is rejected. Catch it locally:

- The mandatory smoke case is seed `[0,0,0,0]` over an empty trace; a conforming
  run returns a parseable verdict there (a garbage trace is a failed round, never
  a crash).
- The CLI is `caputchin-selfcheck` (shipped by `@caputchin/engine-kit`). For
  richer checks with recorded traces, call `selfCheck(run, cases)` directly;
  `selfCheckRun(run)` is the convenience path over default seeds and the smoke
  case.

Add the self-check to your test command so a determinism regression fails CI, not
the marketplace indexer.

## The easy on-ramp: the engine kit

`@caputchin/engine-kit` provides a reducer-to-run adapter: write your game as a
fixed-step reducer once and the kit gives you both the live fixed-step loop and a
conforming `run` plus a default trace codec. This is the lowest-effort way to get
a matching live and replay pair without wiring determinism by hand.

## Learn more

- replay-contract reference: https://github.com/Caputchin/caputchin-sdk/tree/main/packages/replay-contract/docs
- determinism kit reference: https://github.com/Caputchin/caputchin-sdk/tree/main/kits/determinism/docs
- replay-selfcheck reference: https://github.com/Caputchin/caputchin-sdk/tree/main/kits/replay-selfcheck/docs
