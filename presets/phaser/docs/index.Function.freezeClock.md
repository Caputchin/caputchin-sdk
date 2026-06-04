# Function: freezeClock()

> **freezeClock**(`scope?`, `nowMs?`): `void`

Freeze the wall clock on `scope` to a fixed value so the headless replay reads
no real time: `Date.now()` and (if present) `performance.now()` return `nowMs`,
and `new Date()` yields a frozen instance. HEADLESS ONLY: live play must keep
the real clock for rendering/audio, so it never calls this.

The frozen `Date` is fully SELF-CONTAINED: it never reads the existing `Date`.
That matters because the deterministic-replay self-check installs a probe that
throws on ANY access to the real `Date`; a wrapper that copied `Date.prototype`
/ `Date.UTC` would trip it. A deterministic run must not parse real-world dates
anyway, so constructor args are ignored (the instance reads as the fixed epoch).
A wrong clock is a determinism hazard, so this is its own explicit step rather
than bundled into the DOM stubs.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `scope` | `object` | `globalThis` |
| `nowMs` | `number` | `0` |

## Returns

`void`
