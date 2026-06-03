/** Value type a configuration key may carry. Drives the resolver's per-value
 *  validator (URL parse for `link`, finite-number check for `number` /
 *  `range`, enum-membership for `list`, literal `true`/`false` for `boolean`,
 *  non-empty for `string`).
 *
 *  Unlike skin types (which are always strings carrying URLs or color
 *  values), configurations carry typed scalars: a `boolean` preset value is
 *  a real `true` / `false` and the game reads it as such. */
export type ConfigValueType = 'string' | 'link' | 'boolean' | 'number' | 'range' | 'list';

/** Schema entry for a single configuration key. Three legal shapes:
 *
 *   - Bare type string (`"show_high_score": "boolean"`) - short-form for
 *     types that need no extra metadata: `string`, `link`, `boolean`,
 *     `number`. `range` and `list` REQUIRE full forms because they carry
 *     constraint data (bounds, enum).
 *   - Array literal as enum (`"levels": ["a","b","c"]`) - short-form for
 *     `list` type. Value must equal one of the array entries exactly.
 *   - Full descriptor (`{ type, name?, description?, ... }`) - every type
 *     accepts this form. `list` uses `{ type:"list", values:[…] }`,
 *     `range` uses `{ type:"range", min, max, step? }`. */
export type ConfigSchemaEntry =
  | 'string' | 'link' | 'boolean' | 'number'
  | readonly string[]
  | { type: 'string' | 'link' | 'boolean' | 'number'; name?: string; description?: string }
  | { type: 'list'; values: readonly string[]; name?: string; description?: string }
  | { type: 'range'; min: number; max: number; step?: number; name?: string; description?: string };

/** One configuration preset declared in `caputchin.json` under
 *  `configurations.presets`. Underscore-prefixed keys are metadata; every
 *  other key is a typed value. Unlike skins / langs, the value can be a
 *  boolean or a number (not just a string). */
export interface ConfigPreset {
  _default?: boolean;
  _extends?: string;
  [key: string]: string | boolean | number | undefined;
}

/** Final configuration object the widget hands the game. `_extends` and
 *  `_default` are stripped during resolution; only the flattened typed
 *  values survive. */
export interface ResolvedConfig {
  [key: string]: string | boolean | number;
}
