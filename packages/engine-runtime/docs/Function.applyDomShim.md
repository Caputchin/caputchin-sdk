# Function: applyDomShim()

> **applyDomShim**(`scope?`): `string`[]

Install the headless DOM stubs onto the given scope (default `globalThis`).
Idempotent; call once before instantiating a framework-headless sim. Returns
the names it installed (for diagnostics/tests). Frameworks reach for these as
bare globals, so `document` / `navigator` / `requestAnimationFrame` are
hoisted onto the scope alongside `window`.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `scope` | `object` | `globalThis` |

## Returns

`string`[]
