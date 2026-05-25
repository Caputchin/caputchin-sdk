// Deterministic transcendental math (ADR-0068).
//
// PURITY RULE (the permanent audit line): every function here is built ONLY
// from operations that are bit-identical across V8 / JSC / SpiderMonkey and
// every V8 roll — `+ - * /`, comparisons, `Math.sqrt` / `Math.abs` /
// `Math.floor` / `Math.round` / `Math.trunc` (all IEEE-754-mandated), integer
// bit ops, and explicit-endian bit reads of a double. NOTHING here may call a
// native transcendental (`Math.sin/cos/tan/exp/log/pow/atan/hypot/cbrt/...`) —
// those are libm-approximated and diverge between a player's ARM device and the
// x86-64 server, which would reject honest players. Kernels are fdlibm-derived.
//
// Accuracy is a gameplay-quality concern, not a determinism one: the identical
// JS runs in the browser worker and the server isolate, so results match bit
// for bit regardless of how close they are to the true value. The polynomials
// here are accurate to ~1e-12 relative over normal game ranges anyway.

// --- bit access (explicit little-endian → platform-independent) -------------
const _dv = new DataView(new ArrayBuffer(8));
const TWO54 = 18014398509481984; // 2^54
const TWO_N54 = 1 / TWO54;

function hiWord(x: number): number {
  _dv.setFloat64(0, x, true);
  return _dv.getUint32(4, true);
}
function loWord(x: number): number {
  _dv.setFloat64(0, x, true);
  return _dv.getUint32(0, true);
}
function fromWords(hi: number, lo: number): number {
  _dv.setUint32(4, hi >>> 0, true);
  _dv.setUint32(0, lo >>> 0, true);
  return _dv.getFloat64(0, true);
}

/** x * 2^n for integer n, via exponent-bit surgery (deterministic). */
function scalbn(x: number, n: number): number {
  if (x === 0 || !isFinite(x)) return x;
  let hi = hiWord(x);
  let e = (hi >> 20) & 0x7ff;
  let lo = loWord(x);
  if (e === 0) {
    // subnormal: normalize by 2^54 first
    x *= TWO54;
    hi = hiWord(x);
    lo = loWord(x);
    e = ((hi >> 20) & 0x7ff) - 54;
  }
  e += n;
  const sign = hi & 0x80000000;
  if (e >= 0x7ff) return sign ? -Infinity : Infinity;
  if (e > 0) return fromWords((hi & 0x800fffff) | (e << 20), lo);
  if (e <= -54) return sign ? -0 : 0;
  // gradual underflow into subnormal range
  e += 54;
  return fromWords((hi & 0x800fffff) | (e << 20), lo) * TWO_N54;
}

// --- constants --------------------------------------------------------------
export const PI = 3.141592653589793;
export const TAU = 6.283185307179586;
export const HALF_PI = 1.5707963267948966;
export const E = 2.718281828459045;
const LN2 = 0.6931471805599453;
const LN10 = 2.302585092994046;

// --- trivially-deterministic passthroughs -----------------------------------
export const abs = Math.abs;
export const floor = Math.floor;
export const ceil = Math.ceil;
export const round = Math.round;
export const trunc = Math.trunc;
export const sign = Math.sign;
export const min = Math.min;
export const max = Math.max;
export const sqrt = Math.sqrt; // IEEE-754 correctly-rounded → deterministic

// --- sin / cos / tan --------------------------------------------------------
// Argument reduction to [-pi/4, pi/4] via a two-part pi/2, then fdlibm kernels.
const INV_PIO2 = 0.6366197723675814; // 2/pi
const PIO2_HI = 1.5707963267341256; // pi/2, high bits
const PIO2_LO = 6.077100506506192e-11; // pi/2, low bits

const S1 = -1.6666666666666632e-1;
const S2 = 8.333333333332249e-3;
const S3 = -1.984126982985795e-4;
const S4 = 2.7557313707070068e-6;
const S5 = -2.5050760253406863e-8;
const S6 = 1.58969099521155e-10;

const C1 = 4.166666666666666e-2;
const C2 = -1.388888888887411e-3;
const C3 = 2.480158728947673e-5;
const C4 = -2.7557143531390686e-7;
const C5 = 2.087572321298175e-9;
const C6 = -1.1359647557788195e-11;

function kernelSin(x: number): number {
  const z = x * x;
  const w = z * z;
  const r = S2 + z * (S3 + z * S4) + z * w * (S5 + z * S6);
  const v = z * x;
  return x + v * (S1 + z * r);
}

function kernelCos(x: number): number {
  const z = x * x;
  const w = z * z;
  const r = z * (C1 + z * (C2 + z * C3)) + w * w * (C4 + z * (C5 + z * C6));
  const hz = 0.5 * z;
  const wv = 1.0 - hz;
  return wv + (1.0 - wv - hz + z * r);
}

/** Reduce x to (n mod 4, y) with y in ~[-pi/4, pi/4]. */
function reduceQuadrant(x: number): { n: number; y: number } {
  const k = Math.round(x * INV_PIO2);
  const y = x - k * PIO2_HI - k * PIO2_LO;
  return { n: k & 3, y };
}

export function sin(x: number): number {
  if (!isFinite(x)) return NaN;
  const { n, y } = reduceQuadrant(x);
  switch (n) {
    case 0:
      return kernelSin(y);
    case 1:
      return kernelCos(y);
    case 2:
      return -kernelSin(y);
    default:
      return -kernelCos(y);
  }
}

export function cos(x: number): number {
  if (!isFinite(x)) return NaN;
  const { n, y } = reduceQuadrant(x);
  switch (n) {
    case 0:
      return kernelCos(y);
    case 1:
      return -kernelSin(y);
    case 2:
      return -kernelCos(y);
    default:
      return kernelSin(y);
  }
}

export function tan(x: number): number {
  if (!isFinite(x)) return NaN;
  return sin(x) / cos(x);
}

// --- exp --------------------------------------------------------------------
const INV_LN2 = 1.4426950408889634;
const LN2_HI = 6.931471803691238e-1;
const LN2_LO = 1.9082149292705877e-10;
const EP1 = 1.6666666666666602e-1;
const EP2 = -2.7777777777015593e-3;
const EP3 = 6.613756321437934e-5;
const EP4 = -1.6533902205465252e-6;
const EP5 = 4.138136797057238e-8;

export function exp(x: number): number {
  if (x !== x) return NaN;
  if (x === Infinity) return Infinity;
  if (x === -Infinity) return 0;
  const k = Math.round(x * INV_LN2);
  const hi = x - k * LN2_HI;
  const lo = k * LN2_LO;
  const xr = hi - lo;
  const t = xr * xr;
  const c = xr - t * (EP1 + t * (EP2 + t * (EP3 + t * (EP4 + t * EP5))));
  const y = 1 - (lo - (xr * c) / (2 - c) - hi);
  return scalbn(y, k);
}

export function expm1(x: number): number {
  return exp(x) - 1;
}

// --- log --------------------------------------------------------------------
const LG1 = 6.666666666666735e-1;
const LG2 = 3.999999999940942e-1;
const LG3 = 2.857142874366239e-1;
const LG4 = 2.222219843214978e-1;
const LG5 = 1.818357216161806e-1;
const LG6 = 1.531383769920937e-1;
const LG7 = 1.479819860511659e-1;

export function log(x: number): number {
  if (x !== x) return NaN;
  if (x < 0) return NaN;
  if (x === 0) return -Infinity;
  if (x === Infinity) return Infinity;

  let hi = hiWord(x);
  let k = 0;
  let xv = x;
  if (hi < 0x00100000) {
    // subnormal: scale up by 2^54
    xv *= TWO54;
    k -= 54;
    hi = hiWord(xv);
  }
  k += (hi >> 20) - 1023;
  // set exponent to 1023 → mantissa in [1, 2)
  hi = (hi & 0x000fffff) | 0x3ff00000;
  let m = fromWords(hi, loWord(xv));
  // fold m into [sqrt(2)/2, sqrt(2)) so |f| stays small and the series converges
  if (m >= 1.4142135623730951) {
    m *= 0.5;
    k += 1;
  }

  const f = m - 1;
  const s = f / (2 + f);
  const z = s * s;
  const w = z * z;
  const t1 = w * (LG2 + w * (LG4 + w * LG6));
  const t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
  const R = t2 + t1;
  const hfsq = 0.5 * f * f;
  return k * LN2_HI - (hfsq - (s * (hfsq + R) + k * LN2_LO) - f);
}

export function log2(x: number): number {
  return log(x) / LN2;
}
export function log10(x: number): number {
  return log(x) / LN10;
}
export function log1p(x: number): number {
  return log(1 + x);
}

// --- pow --------------------------------------------------------------------
/** x^y. Built as exp(y*log(x)) with sign/integer-exponent handling. */
export function pow(x: number, y: number): number {
  if (y === 0) return 1;
  if (y === 1) return x;
  if (x !== x || y !== y) return NaN;
  if (x === 0) {
    if (y > 0) return 0;
    return Infinity;
  }
  // Exact path for integer exponents in a sane range: exponentiation by
  // squaring is multiplications only, so it is exact and deterministic and
  // avoids the exp(y*log) rounding that otherwise makes e.g. pow(-2, 30) come
  // out 1073741823.9999996. Sign of a negative base falls out naturally.
  if (y === (y | 0) && y >= -1024 && y <= 1024) {
    let base = x;
    let e = y < 0 ? -y : y;
    let r = 1;
    while (e > 0) {
      if (e & 1) r *= base;
      e >>>= 1;
      if (e > 0) base *= base;
    }
    return y < 0 ? 1 / r : r;
  }
  if (x > 0) return exp(y * log(x));
  // x < 0: defined only for integer y (else NaN)
  if (Math.floor(y) !== y) return NaN;
  const mag = exp(y * log(-x));
  // odd exponent keeps the sign
  return y % 2 === 0 ? mag : -mag;
}

// --- atan / atan2 -----------------------------------------------------------
const AT0 = 3.333333333333293e-1;
const AT1 = -1.999999999987648e-1;
const AT2 = 1.428571427250346e-1;
const AT3 = -1.111110793700371e-1;
const AT4 = 9.090887133436507e-2;
const AT5 = -7.691876205044313e-2;
const AT6 = 6.661073137387531e-2;
const AT7 = -5.83357013379057e-2;
const AT8 = 4.97687799461593e-2;
const AT9 = -3.65315727442169e-2;
const AT10 = 1.628582011536578e-2;

// Per-segment offsets (atan of the segment center), split hi/lo for precision.
const ATAN_HI = [
  4.636476090008061e-1, // atan(0.5)
  7.853981633974483e-1, // atan(1)   = pi/4
  9.827937232473291e-1, // atan(1.5)
  1.5707963267948966, // atan(inf) = pi/2
];
const ATAN_LO = [
  2.2698777452961687e-17,
  3.061616997868383e-17,
  1.3903311031230998e-17,
  6.123233995736766e-17,
];

function kernelAtan(x: number): number {
  const z = x * x;
  const w = z * z;
  const s1 =
    z * (AT0 + w * (AT2 + w * (AT4 + w * (AT6 + w * (AT8 + w * AT10)))));
  const s2 = w * (AT1 + w * (AT3 + w * (AT5 + w * (AT7 + w * AT9))));
  return s1 + s2;
}

export function atan(x: number): number {
  if (x !== x) return NaN;
  if (x === Infinity) return HALF_PI;
  if (x === -Infinity) return -HALF_PI;
  const neg = x < 0;
  const a = neg ? -x : x;

  // Reduce to |reduced| <= ~7/16 by picking a segment and shifting (fdlibm):
  // four breakpoints (7/16, 11/16, 19/16, 39/16) keep the reduced argument
  // small enough that the single polynomial is accurate to ~1e-16.
  let r: number;
  if (a < 0.4375) {
    r = a - a * kernelAtan(a);
  } else {
    let id: number;
    let t: number;
    if (a < 0.6875) {
      id = 0;
      t = (2 * a - 1) / (2 + a);
    } else if (a < 1.1875) {
      id = 1;
      t = (a - 1) / (a + 1);
    } else if (a < 2.4375) {
      id = 2;
      t = (a - 1.5) / (1 + 1.5 * a);
    } else {
      id = 3;
      t = -1 / a;
    }
    r = ATAN_HI[id] - (t * kernelAtan(t) - ATAN_LO[id] - t);
  }
  return neg ? -r : r;
}

export function atan2(y: number, x: number): number {
  if (x !== x || y !== y) return NaN;
  if (x === 0 && y === 0) return 0;
  if (x === 0) return y > 0 ? HALF_PI : -HALF_PI;
  const base = atan(y / x);
  if (x > 0) return base;
  return y >= 0 ? base + PI : base - PI;
}

export function asin(x: number): number {
  if (x < -1 || x > 1) return NaN;
  return atan2(x, sqrt((1 - x) * (1 + x)));
}
export function acos(x: number): number {
  if (x < -1 || x > 1) return NaN;
  return atan2(sqrt((1 - x) * (1 + x)), x);
}

// --- hypot / cbrt / hyperbolics --------------------------------------------
export function hypot(x: number, y: number): number {
  x = Math.abs(x);
  y = Math.abs(y);
  if (x === 0) return y;
  if (y === 0) return x;
  // scale by the larger to avoid intermediate overflow/underflow
  const m = x > y ? x : y;
  const a = x / m;
  const b = y / m;
  return m * sqrt(a * a + b * b);
}

export function cbrt(x: number): number {
  if (x === 0 || !isFinite(x)) return x;
  const s = x < 0 ? -1 : 1;
  return s * exp(log(s * x) / 3);
}

export function sinh(x: number): number {
  const e = exp(x);
  return (e - 1 / e) / 2;
}
export function cosh(x: number): number {
  const e = exp(x);
  return (e + 1 / e) / 2;
}
export function tanh(x: number): number {
  if (x === Infinity) return 1;
  if (x === -Infinity) return -1;
  const e = exp(2 * x);
  return (e - 1) / (e + 1);
}

/**
 * The deterministic math surface. Import and call `cap.math.sin(...)` in engine
 * code instead of `Math.sin(...)`. The shim also swaps `Math.*` transcendentals
 * to point here as a runtime safety net.
 */
export const capMath = {
  PI,
  TAU,
  HALF_PI,
  E,
  abs,
  floor,
  ceil,
  round,
  trunc,
  sign,
  min,
  max,
  sqrt,
  sin,
  cos,
  tan,
  asin,
  acos,
  atan,
  atan2,
  exp,
  expm1,
  log,
  log2,
  log10,
  log1p,
  pow,
  hypot,
  cbrt,
  sinh,
  cosh,
  tanh,
} as const;
