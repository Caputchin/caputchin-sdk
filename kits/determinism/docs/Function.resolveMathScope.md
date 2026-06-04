# Function: resolveMathScope()

> **resolveMathScope**(`scope?`): `Record`\<`string`, `unknown`\>

Resolve the `Math` object a scope sees: its own `Math` if it has one, else the
ambient `Math`. The one audited resolution every Math-touching helper here
shares, so the swap and any later ban/seed all target the SAME object and the
rule can't drift between call sites.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `scope` | `object` | `globalThis` |

## Returns

`Record`\<`string`, `unknown`\>
