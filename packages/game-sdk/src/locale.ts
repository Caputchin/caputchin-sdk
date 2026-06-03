/** One locale preset declared in `caputchin.json` under `locales.presets`.
 *  Underscore-prefixed keys are metadata; every other key is a translatable
 *  text token. A locale carries a `_lang` BCP-47 language tag; multiple
 *  presets may share a `_lang` (e.g. two English copy variants). Direction
 *  can be omitted and is auto-derived from `_lang` when the language is in
 *  the RTL set (ar, he, fa, ur, yi, ps, sd). */
export interface LocalePreset {
  _lang?: string;
  _direction?: 'ltr' | 'rtl';
  _default?: boolean;
  _extends?: string;
  [key: string]: string | boolean | undefined;
}

/** Final locale object the widget hands the game. `_extends` and
 *  `_default` are stripped during resolution; only metadata (`_lang`,
 *  `_direction`) and text tokens survive. The language-tag key was renamed
 *  from `_iso` to `_lang` after v2.0.0; read `_lang`. */
export interface ResolvedLocale {
  _direction: 'ltr' | 'rtl';
  _lang: string;
  [key: string]: string;
}

/** Documentation entry for a single text key in `locales.presets`.
 *  Optional and additive: omitting `schema` entirely or omitting individual
 *  keys does not affect resolution. Schema is consumed by author tooling,
 *  translator workflows, and the future per-site-key override dashboard;
 *  the widget runtime ignores it. */
export interface LocaleKeySchema {
  /** Short readable label translators see in tooling and dashboard. */
  name: string;
  /** Longer helper text: what this string IS in the UX, not where it
   *  appears in code. */
  description: string;
  /** Token placeholder names this string interpolates (without braces).
   *  Declared once at the manifest level so dashboards can render labeled
   *  inputs and CI checks can assert every locale preserves the tokens.
   *  Omit when the string has no interpolation. */
  tokens?: string[];
}
