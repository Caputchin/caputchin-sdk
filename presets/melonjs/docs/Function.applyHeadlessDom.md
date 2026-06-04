# Function: applyHeadlessDom()

> **applyHeadlessDom**(`scope?`): `string`[]

Install the headless DOM stubs onto `scope` (default `globalThis`) so a
browser-targeted game engine boots with no real DOM. Idempotent; call once
before the engine evaluates on the server. Returns the names it installed (for
diagnostics / tests).

HEADLESS ONLY: never call in a real browser; it would shadow the live DOM.
Provides existence + deterministic defaults for `window` / `self` / `document`
/ `navigator` / `screen` / a `<canvas>` (+ no-op 2D/GL context) / `Image` /
`OffscreenCanvas` / `Path2D` / `performance` / `location` / `matchMedia` /
`devicePixelRatio`, bare `addEventListener` / `removeEventListener`, and a
`requestAnimationFrame` that never fires. Does NOT freeze the wall clock;
pair with [freezeClock](Function.freezeClock.md) on the server.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `scope?` | `object` |

## Returns

`string`[]
