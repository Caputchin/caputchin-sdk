# Function: swapMathInto()

> **swapMathInto**(`math`): `string`[]

Swap the non-deterministic transcendentals on an ALREADY-RESOLVED `math`
object (see [resolveMathScope](Function.resolveMathScope.md)) to the [capMath](Variable.capMath.md) kernels. The
primitive behind [swapMath](Function.swapMath.md); a caller that already holds the resolved
`math` (e.g. to also ban `Math.random` on it) uses this to avoid re-resolving.
Returns the names it swapped.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `math` | `Record`\<`string`, `unknown`\> |

## Returns

`string`[]
