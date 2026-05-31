# Variable: capMath

> `const` **capMath**: `object`

The deterministic math surface. Import and call `cap.math.sin(...)` in engine
code instead of `Math.sin(...)`. The shim also swaps `Math.*` transcendentals
to point here as a runtime safety net.

## Type Declaration

| Name | Type |
| ------ | ------ |
| <a id="property-abs"></a> `abs()` | (`x`) => `number` |
| <a id="property-acos"></a> `acos()` | (`x`) => `number` |
| <a id="property-asin"></a> `asin()` | (`x`) => `number` |
| <a id="property-atan"></a> `atan()` | (`x`) => `number` |
| <a id="property-atan2"></a> `atan2()` | (`y`, `x`) => `number` |
| <a id="property-cbrt"></a> `cbrt()` | (`x`) => `number` |
| <a id="property-ceil"></a> `ceil()` | (`x`) => `number` |
| <a id="property-cos"></a> `cos()` | (`x`) => `number` |
| <a id="property-cosh"></a> `cosh()` | (`x`) => `number` |
| <a id="property-e"></a> `E` | `2.718281828459045` |
| <a id="property-exp"></a> `exp()` | (`x`) => `number` |
| <a id="property-expm1"></a> `expm1()` | (`x`) => `number` |
| <a id="property-floor"></a> `floor()` | (`x`) => `number` |
| <a id="property-half_pi"></a> `HALF_PI` | `1.5707963267948966` |
| <a id="property-hypot"></a> `hypot()` | (`x`, `y`) => `number` |
| <a id="property-log"></a> `log()` | (`x`) => `number` |
| <a id="property-log10"></a> `log10()` | (`x`) => `number` |
| <a id="property-log1p"></a> `log1p()` | (`x`) => `number` |
| <a id="property-log2"></a> `log2()` | (`x`) => `number` |
| <a id="property-max"></a> `max()` | (...`values`) => `number` |
| <a id="property-min"></a> `min()` | (...`values`) => `number` |
| <a id="property-pi"></a> `PI` | `3.141592653589793` |
| <a id="property-pow"></a> `pow()` | (`x`, `y`) => `number` |
| <a id="property-round"></a> `round()` | (`x`) => `number` |
| <a id="property-sign"></a> `sign()` | (`x`) => `number` |
| <a id="property-sin"></a> `sin()` | (`x`) => `number` |
| <a id="property-sinh"></a> `sinh()` | (`x`) => `number` |
| <a id="property-sqrt"></a> `sqrt()` | (`x`) => `number` |
| <a id="property-tan"></a> `tan()` | (`x`) => `number` |
| <a id="property-tanh"></a> `tanh()` | (`x`) => `number` |
| <a id="property-tau"></a> `TAU` | `6.283185307179586` |
| <a id="property-trunc"></a> `trunc()` | (`x`) => `number` |
