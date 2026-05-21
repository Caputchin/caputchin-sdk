import * as v from 'valibot';
import type { ConfigSchemaEntry, ConfigValueType } from '@caputchin/game-sdk';

// Valibot's per-type schemas have heterogeneous output types (string vs
// number vs boolean vs literal-union). The dispatch helper returns a
// generic schema type covering the union; the concrete `safeParse` path
// at the bottom narrows back to a boolean ok/reason verdict.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema = v.GenericSchema<any>;

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

/** Build a valibot validator for the normalized schema entry. Per-type
 *  schemas are intentionally narrow: no string-coercion, no number-coercion.
 *  The preset author is responsible for typing values correctly in the JSON.
 *  `link` is restricted to `http://` / `https://` via the protocol regex so
 *  `javascript:`, `data:text/html`, `file:` etc. never reach the iframe. */
function buildSchema(entry: NormalizedSchemaEntry): AnySchema {
  switch (entry.type) {
    case 'string':
      return v.pipe(v.string(), v.minLength(1, 'expected non-empty string'));
    case 'link':
      // `v.url()` parses via the browser URL constructor; the scheme regex
      // rejects javascript:, data:, file:, and anything else outside the
      // http/https allow-list structurally.
      return v.pipe(v.string(), v.url('expected an http or https URL'), v.regex(/^https?:/i, 'expected an http or https URL'));
    case 'boolean':
      return v.boolean();
    case 'number':
      // `v.finite` rejects NaN + Infinity. `v.number()` alone accepts them.
      return v.pipe(v.number(), v.finite());
    case 'range':
      return v.pipe(v.number(), v.finite(), v.minValue(entry.min), v.maxValue(entry.max));
    case 'list':
      if (entry.values.length === 0) {
        return v.never('list enum is empty');
      }
      return v.picklist([...entry.values]);
  }
}

/** Validate a configuration value against its normalized schema entry. */
export function validateConfigValue(
  entry: NormalizedSchemaEntry,
  value: unknown,
): ValidationResult {
  const schema = buildSchema(entry);
  const result = v.safeParse(schema, value);
  if (result.success) return { ok: true };
  const issue = result.issues[0];
  return { ok: false, reason: issue?.message ?? 'invalid value' };
}
