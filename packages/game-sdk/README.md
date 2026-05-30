# @caputchin/game-sdk

TypeScript helpers and types for authors building games that run inside the Caputchin widget. First-party and third-party games use the same public API; no private contract.

## Install

```sh
npm install @caputchin/game-sdk
```

## Usage

```javascript
import { register } from '@caputchin/game-sdk';

register((container, bridge) => {
  // Render your game UI into container (inside the sandboxed iframe).
  // Call bridge.pass() only when the player passes the round.
  // If the player fails or abandons, do not call bridge.pass; silence is the failure signal.
  bridge.pass({ score: 850, durationMs: 4200 });

  // Return an optional cleanup function.
  return () => { /* teardown */ };
});
```

`score` is any number; the platform doesn't interpret it. Compare scores within a single game only. The bridge is push-only: your game calls `bridge.pass()` (success only) or `bridge.error()` (game crashed); the widget drives the rest.

## Full reference

[docs/game-sdk.md](../../docs/game-sdk.md); `register()` signature, Bridge interface, score semantics.

[Publishing to the marketplace](../../docs/guides/publish-to-marketplace.md); how to list your game.
