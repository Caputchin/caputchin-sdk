# @caputchin/game-sdk

TypeScript helpers and types for authors building games that run inside the Caputchin widget. First-party and third-party games use the same public API — no private contract.

## Install

```sh
npm install @caputchin/game-sdk
```

## Usage

```javascript
import { register } from '@caputchin/game-sdk';

register('my-game-id', (container, bridge) => {
  // Render your game UI into container (inside the sandboxed iframe).
  // Call bridge.complete() when the player finishes a round.
  bridge.complete({ score: 0.85, durationMs: 4200 });

  // Return an optional cleanup function.
  return () => { /* teardown */ };
});
```

`score` is normalized `0.0–1.0`. The bridge is push-only: your game calls `bridge.complete()` or `bridge.error()`; the widget drives the rest.

## Full reference

[docs/game-sdk.md](../../docs/game-sdk.md) — `register()` signature, Bridge interface, score semantics.

[Publishing to the marketplace](../../docs/guides/publish-to-marketplace.md) — how to list your game.
