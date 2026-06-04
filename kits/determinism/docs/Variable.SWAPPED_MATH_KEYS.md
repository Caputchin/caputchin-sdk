# Variable: SWAPPED\_MATH\_KEYS

> `const` **SWAPPED\_MATH\_KEYS**: `ReadonlyArray`\<keyof *typeof* [`capMath`](Variable.capMath.md) & `string`\>

The `Math` members that are NOT bit-identical across JS engines / CPU archs
and must be swapped to the deterministic [capMath](Variable.capMath.md) kernels. The
IEEE-754-mandated members (`sqrt` / `abs` / `floor` / `round` / `min` / `max`
/ ...) are already deterministic and are deliberately absent.

Exported as the single source of truth so consumers that need the same list
(e.g. a self-check that probes "does the verdict depend on native trig?") do
not re-hardcode it and drift when a kernel is added.
