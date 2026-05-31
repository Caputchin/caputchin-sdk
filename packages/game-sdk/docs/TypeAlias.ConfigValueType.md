# Type Alias: ConfigValueType

> **ConfigValueType** = `"string"` \| `"link"` \| `"boolean"` \| `"number"` \| `"range"` \| `"list"`

Value type a configuration key may carry. Drives the resolver's per-value
 validator (URL parse for `link`, finite-number check for `number` /
 `range`, enum-membership for `list`, literal `true`/`false` for `boolean`,
 non-empty for `string`).

 Unlike skin types (which are always strings carrying URLs or color
 values), configurations carry typed scalars: a `boolean` preset value is
 a real `true` / `false` and the game reads it as such.
