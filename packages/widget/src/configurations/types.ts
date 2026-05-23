import type { ConfigSchemaEntry, ConfigValueType } from '@caputchin/game-sdk';

/** Normalized representation of a schema entry. Lets the validator pull
 *  a single shape regardless of which authoring form the manifest used:
 *  bare-type, full descriptor, array-as-enum. */
export type NormalizedSchemaEntry =
  | { type: 'string' | 'link' | 'boolean' | 'number' }
  | { type: 'list'; values: readonly string[] }
  | { type: 'range'; min: number; max: number; step?: number };

export type ValidationResult = { ok: true } | { ok: false; reason: string };

/** Normalize a schema entry into a single discriminated-union shape. Returns
 *  null when the entry is malformed (caller treats absence as "no type
 *  declared" and passes the value through unvalidated). */
export function normalizeSchemaEntry(entry: ConfigSchemaEntry | undefined): NormalizedSchemaEntry | null {
  if (!entry) return null;
  // Bare-type-string short-form.
  if (typeof entry === 'string') {
    if (entry === 'string' || entry === 'link' || entry === 'boolean' || entry === 'number') {
      return { type: entry };
    }
    return null;
  }
  // Array-literal-as-enum short-form: `"levels": ["a","b","c"]`.
  // Strings only; duplicates collapsed so an `["a","a","b"]` author
  // mistake produces a 2-value enum instead of a noisy 3-with-dupes.
  if (Array.isArray(entry)) {
    const strs = entry.filter((s): s is string => typeof s === 'string');
    return { type: 'list', values: Array.from(new Set(strs)) };
  }
  if (typeof entry !== 'object') return null;
  const obj = entry as Record<string, unknown>;
  const t = obj['type'] as ConfigValueType | undefined;
  if (t === 'string' || t === 'link' || t === 'boolean' || t === 'number') return { type: t };
  if (t === 'list') {
    const raw = Array.isArray(obj['values'])
      ? (obj['values'] as unknown[]).filter((s): s is string => typeof s === 'string')
      : [];
    return { type: 'list', values: Array.from(new Set(raw)) };
  }
  if (t === 'range') {
    const min = typeof obj['min'] === 'number' ? (obj['min'] as number) : NaN;
    const max = typeof obj['max'] === 'number' ? (obj['max'] as number) : NaN;
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    const step = typeof obj['step'] === 'number' ? (obj['step'] as number) : undefined;
    return { type: 'range', min, max, step };
  }
  return null;
}

/** Validate a `link` value: must parse as a URL, use the http(s) scheme, and
 *  carry no embedded credentials. Rejects `javascript:`, `data:`, `file:`,
 *  relative paths, and `user:pass@` forms so a customer-supplied link can
 *  never carry an executable scheme or leak embedded auth into the iframe. */
function validateLink(value: unknown): ValidationResult {
  if (typeof value !== 'string') return { ok: false, reason: 'expected an http or https URL' };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: 'expected an http or https URL' };
  }
  // Scheme check on the raw string (the URL constructor accepts javascript:,
  // data:, file: etc. as valid URLs) keeps the rule the documented http/https
  // prefix contract.
  if (!/^https?:/i.test(value)) return { ok: false, reason: 'expected an http or https URL' };
  // Userinfo in a customer link is almost always a leak (auth embedded in a
  // shared brand link), so reject by default and force the safe form.
  if (url.username !== '' || url.password !== '') {
    return { ok: false, reason: 'URL must not embed credentials (user:pass@)' };
  }
  return { ok: true };
}

/** Validate a configuration value against its normalized schema entry.
 *  Per-type checks are intentionally narrow: no string- or number-coercion;
 *  the preset author is responsible for typing values correctly in the JSON. */
export function validateConfigValue(
  entry: NormalizedSchemaEntry,
  value: unknown,
): ValidationResult {
  switch (entry.type) {
    case 'string':
      return typeof value === 'string' && value.length >= 1
        ? { ok: true }
        : { ok: false, reason: 'expected non-empty string' };
    case 'link':
      return validateLink(value);
    case 'boolean':
      return typeof value === 'boolean'
        ? { ok: true }
        : { ok: false, reason: 'expected a boolean' };
    case 'number':
      // Reject NaN + Infinity (a bare typeof check would accept them).
      return typeof value === 'number' && Number.isFinite(value)
        ? { ok: true }
        : { ok: false, reason: 'expected a finite number' };
    case 'range':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return { ok: false, reason: 'expected a finite number' };
      }
      return value >= entry.min && value <= entry.max
        ? { ok: true }
        : { ok: false, reason: `expected a number between ${entry.min} and ${entry.max}` };
    case 'list':
      if (entry.values.length === 0) return { ok: false, reason: 'list enum is empty' };
      return typeof value === 'string' && entry.values.includes(value)
        ? { ok: true }
        : { ok: false, reason: `expected one of: ${entry.values.join(', ')}` };
  }
}
