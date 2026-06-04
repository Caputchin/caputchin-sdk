# Function: installKaplayShim()

> **installKaplayShim**(`scope?`): [`KaplayShim`](Interface.KaplayShim.md)

Install the KAPLAY headless globals onto `scope` (default `globalThis`) and
return a [KaplayShim](Interface.KaplayShim.md). `requestAnimationFrame` is CAPTURING: it stores
the callback instead of scheduling it, so KAPLAY's loop only advances when
[KaplayShim.flushFrame](Interface.KaplayShim.md#flushframe) is called. Also makes `Math` transcendentals
deterministic (the kit's `makeDeterministic`) and freezes the wall clock (the
kit's `freezeClock`) so the headless replay is bit-identical to live play and
independent of when it runs. [KaplayShim.uninstall](Interface.KaplayShim.md#uninstall) fully restores all of
it. Idempotent per scope is NOT guaranteed - install once, uninstall when done.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `scope` | `object` | `globalThis` |

## Returns

[`KaplayShim`](Interface.KaplayShim.md)
