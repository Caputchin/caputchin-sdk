# Variable: cap

> `const` **cap**: `object`

The author-facing toolkit, grouped for ergonomics:
`cap.rng(seed)` for randomness, `cap.math.sin(...)` for deterministic
transcendentals. (Both are also exported individually above.)

## Type Declaration

| Name | Type | Default value |
| ------ | ------ | ------ |
| <a id="property-math"></a> `math` | `object` | `capMath` |
| `math.abs()` | (`x`) => `number` | - |
| `math.acos()` | (`x`) => `number` | - |
| `math.asin()` | (`x`) => `number` | - |
| `math.atan()` | (`x`) => `number` | - |
| `math.atan2()` | (`y`, `x`) => `number` | - |
| `math.cbrt()` | (`x`) => `number` | - |
| `math.ceil()` | (`x`) => `number` | - |
| `math.cos()` | (`x`) => `number` | - |
| `math.cosh()` | (`x`) => `number` | - |
| `math.E` | `2.718281828459045` | - |
| `math.exp()` | (`x`) => `number` | - |
| `math.expm1()` | (`x`) => `number` | - |
| `math.floor()` | (`x`) => `number` | - |
| `math.HALF_PI` | `1.5707963267948966` | - |
| `math.hypot()` | (`x`, `y`) => `number` | - |
| `math.log()` | (`x`) => `number` | - |
| `math.log10()` | (`x`) => `number` | - |
| `math.log1p()` | (`x`) => `number` | - |
| `math.log2()` | (`x`) => `number` | - |
| `math.max()` | (...`values`) => `number` | - |
| `math.min()` | (...`values`) => `number` | - |
| `math.PI` | `3.141592653589793` | - |
| `math.pow()` | (`x`, `y`) => `number` | - |
| `math.round()` | (`x`) => `number` | - |
| `math.sign()` | (`x`) => `number` | - |
| `math.sin()` | (`x`) => `number` | - |
| `math.sinh()` | (`x`) => `number` | - |
| `math.sqrt()` | (`x`) => `number` | - |
| `math.tan()` | (`x`) => `number` | - |
| `math.tanh()` | (`x`) => `number` | - |
| `math.TAU` | `6.283185307179586` | - |
| `math.trunc()` | (`x`) => `number` | - |
| <a id="property-rng"></a> `rng()` | (`seed`) => [`Rng`](Interface.Rng.md) | - |
| <a id="property-rngfromstate"></a> `rngFromState()` | (`s`) => [`Rng`](Interface.Rng.md) | - |
