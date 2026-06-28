---
name: caputchin-game-development
description: Build a custom verification game for Caputchin, the game-based human-verification service. Use this whenever the user is authoring, scaffolding, testing, packaging, or publishing a Caputchin game with the game-sdk register() entry point; implementing the mandatory deterministic server-replay run(seed, config, trace) contract so the live play and the server isolate agree on the verdict; adding seeded randomness or deterministic math with the determinism kit; wiring a game engine onto the replay platform through a Caputchin preset (Kaplay, Phaser, melonJS, Excalibur, Rapier, or Bevy); writing the caputchin.json manifest; running the headless self-check; or submitting a game to the Caputchin marketplace. For embedding an already-published game or the plain CAPTCHA on a site, use the caputchin skill instead.
license: Apache-2.0
metadata:
  source: https://github.com/Caputchin/caputchin-sdk
---

# Caputchin game development

A Caputchin game is a tiny, replayable challenge a visitor plays to prove they
are human. What makes it different from an ordinary web game is the one hard
requirement: **the server can re-run the round and get the exact same verdict.**

## The one idea that governs everything: deterministic replay

A game has two execution sides, and they must agree:

1. **Live (browser):** your playable game, registered with `register(factory)`.
   When the round ends you hand the widget the recorded inputs via
   `bridge.pass({ trace })`. You do not report whether they passed; the trace is
   just what happened.
2. **Replay (server isolate):** a pure function
   `run(seed, config, trace) -> { passed, score, durationMs }` that re-plays
   those inputs and computes the authoritative verdict.

The contract: for the same `(seed, config, trace)`, `run` MUST return an
identical verdict in the browser and in the server isolate. The server isolate
is hostile, no real clock, no `Math.random`, no native trig, so any
nondeterminism (wall-clock, unseeded randomness, engine-divergent floating point)
breaks verification. This is why determinism is not optional and why you seed all
randomness from `ctx.seed`.

If you internalize this split, everything else is detail.

## Minimal shape

```js
import { register } from "@caputchin/game-sdk";

register((container, bridge, ctx) => {
  // ctx.seed is the per-round seed; seed ALL randomness from it.
  // ctx.config / ctx.locale / ctx.skin are server-resolved (may be null).
  const inputs = [];
  // ... render into `container`, record player inputs into `inputs` ...
  function onRoundComplete() {
    bridge.pass({ trace: JSON.stringify(inputs) }); // opaque to the platform
  }
  return () => {/* optional cleanup on teardown */};
});
```

And the replay artifact, deterministic on both sides:

```js
export function run(seed, config, trace) {
  const inputs = JSON.parse(trace);
  // re-simulate using the SAME seed and logic as live play
  return { passed: /* ... */ true, score: 0, durationMs: 0 };
}
```

The export name is fixed (`RUN_EXPORT_NAME` from `@caputchin/replay-contract`).

## Router: pick the task, read the reference

| The user wants to... | Read |
| --- | --- |
| Understand and satisfy the run contract, seeds, determinism kit, self-check | [references/determinism-replay.md](references/determinism-replay.md) |
| Use a real game engine (Kaplay, Phaser, melonJS, Excalibur, Rapier, Bevy) | [references/engine-presets.md](references/engine-presets.md) |
| Write `caputchin.json` and publish to the marketplace | [references/manifest-and-publish.md](references/manifest-and-publish.md) |

## Guardrails

- **Never gate on a client value.** The trace is data, not a verdict. `bridge.pass`
  does not carry a score; the server's `run` decides `passed`. A game that tries
  to self-report a pass is trivially forged.
- **Seed from `ctx.seed`, nothing else.** No `Date.now()`, no `Math.random()`
  without a seeded trap, no native `Math.sin`/`cos`/etc. in gameplay math. The
  determinism kit gives you cross-engine-stable replacements.
- **Keep the trace small and self-describing.** Your `run` is the only thing that
  interprets it; there is a byte cap and a CPU budget on replay.
- **Run the self-check before you ship.** A game that fails determinism is
  rejected at index time; catch it locally with `caputchin-selfcheck`.

## Learn more

- game-sdk reference: https://github.com/Caputchin/caputchin-sdk/tree/main/packages/game-sdk/docs
- replay-contract reference: https://github.com/Caputchin/caputchin-sdk/tree/main/packages/replay-contract/docs
- Customer docs portal: https://docs.caputchin.com
