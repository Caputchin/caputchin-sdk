# Function: sealHeadlessAmbient()

> **sealHeadlessAmbient**(`scope?`): `void`

Seal the deterministic clock + scheduler so a FRAMEWORK engine that reads them
at RUN-TIME survives the replay self-check's (and the real replay isolate's)
ambient ban. Call AFTER [applyHeadlessDom](Function.applyHeadlessDom.md) + [freezeClock](Function.freezeClock.md); this is
server / replay side only (the live browser keeps the real clock + scheduler).

Why the stubs are not enough on their own: a framework engine boots its game
loop lazily, inside `run()` (per round), and that loop reads `Date` /
`performance.now()` / `requestAnimationFrame` / `setTimeout` as it constructs -
INSIDE the self-check's run-time ban window, unlike a value read once at module
eval (e.g. `navigator`, cached before the ban). The ban replaces a banned global
via `Object.defineProperty(..., { configurable: true })` in a try/catch, so it
shadows the CONFIGURABLE stubs [applyHeadlessDom](Function.applyHeadlessDom.md) / [freezeClock](Function.freezeClock.md)
install and the loop throws. Re-installing them NON-CONFIGURABLE makes that
reconfigure throw and be skipped (the ban's documented carve-out for a host
global it cannot patch), so the loop keeps reading the deterministic stub.

The sealed bindings stay WRITABLE: the ban defeats itself on `configurable:
false` alone (it cannot turn a non-configurable property configurable), so a
host test runner that REASSIGNS a global by plain assignment (e.g. vitest
swapping `setTimeout` around a test) keeps working - only the ban's reconfigure
is blocked, not assignment.

The preset never uses the engine's own loop (it drives the fixed-step update
directly), so the timer stubs are no-ops that never fire - the loop stays
dormant. The clock objects keep a WRITABLE `.now` (`Date.now` / `performance.now`
are properties of the sealed objects, not the sealed global binding), so
[withDeterministicEnv](Function.withDeterministicEnv.md) still overrides them per step.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `scope` | `object` | `globalThis` |

## Returns

`void`
