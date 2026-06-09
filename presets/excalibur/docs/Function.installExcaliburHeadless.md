# Function: installExcaliburHeadless()

> **installExcaliburHeadless**(`scope?`): `void`

The full headless boot env for the replay isolate: DOM stubs + deterministic
`Math` transcendentals + frozen wall clock. Call once at module load (via
`@caputchin/preset-excalibur/install`) AND at the start of every `run()` so the
env survives the self-check prober - re-installing re-asserts the deterministic
stubs (as plain VALUES, a define never a read) over the prober's per-call
access-tracking getters, which is what keeps the engine's `performance.now`
clock reads from registering as ambient access. (Sealing the ambient set
non-configurable is deliberately NOT done: it is unnecessary here - verified by
the replay self-check passing without it - and would turn `setTimeout` into a
non-firing no-op that hangs a host test runner.) HEADLESS ONLY.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `scope` | `object` | `globalThis` |

## Returns

`void`
