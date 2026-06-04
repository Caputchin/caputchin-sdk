# Variable: capMath

> `const` **capMath**: `object`

The deterministic math surface. Import and call `cap.math.sin(...)` in engine
code instead of `Math.sin(...)`. The shim also swaps `Math.*` transcendentals
to point here as a runtime safety net.

## Type Declaration

| Name | Type |
| ------ | ------ |
| <a id="property-abs"></a> `abs()` | (`x`) => `number` |
| <a id="property-acos"></a> `acos` | *typeof* `acos` |
| <a id="property-asin"></a> `asin` | *typeof* `asin` |
| <a id="property-atan"></a> `atan` | *typeof* `atan` |
| <a id="property-atan2"></a> `atan2` | *typeof* `atan2` |
| <a id="property-cbrt"></a> `cbrt` | *typeof* `cbrt` |
| <a id="property-ceil"></a> `ceil()` | (`x`) => `number` |
| <a id="property-cos"></a> `cos` | *typeof* `cos` |
| <a id="property-cosh"></a> `cosh` | *typeof* `cosh` |
| <a id="property-e"></a> `E` | `2.718281828459045` |
| <a id="property-exp"></a> `exp` | *typeof* `exp` |
| <a id="property-expm1"></a> `expm1` | *typeof* `expm1` |
| <a id="property-floor"></a> `floor()` | (`x`) => `number` |
| <a id="property-half_pi"></a> `HALF_PI` | `1.5707963267948966` |
| <a id="property-hypot"></a> `hypot` | *typeof* `hypot` |
| <a id="property-log"></a> `log` | *typeof* `log` |
| <a id="property-log10"></a> `log10` | *typeof* `log10` |
| <a id="property-log1p"></a> `log1p` | *typeof* `log1p` |
| <a id="property-log2"></a> `log2` | *typeof* `log2` |
| <a id="property-max"></a> `max()` | (...`values`) => `number` |
| <a id="property-min"></a> `min()` | (...`values`) => `number` |
| <a id="property-pi"></a> `PI` | `3.141592653589793` |
| <a id="property-pow"></a> `pow` | *typeof* `pow` |
| <a id="property-round"></a> `round()` | (`x`) => `number` |
| <a id="property-sign"></a> `sign()` | (`x`) => `number` |
| <a id="property-sin"></a> `sin` | *typeof* `sin` |
| <a id="property-sinh"></a> `sinh` | *typeof* `sinh` |
| <a id="property-sqrt"></a> `sqrt()` | (`x`) => `number` |
| <a id="property-tan"></a> `tan` | *typeof* `tan` |
| <a id="property-tanh"></a> `tanh` | *typeof* `tanh` |
| <a id="property-tau"></a> `TAU` | `6.283185307179586` |
| <a id="property-trunc"></a> `trunc()` | (`x`) => `number` |
