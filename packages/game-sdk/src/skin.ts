/** Value type a skin key may carry. Drives the resolver's per-value validator.
 *  `color` accepts hex (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`) and functional
 *  `rgb(...)` / `rgba(...)`. Asset types (`image` / `audio` / `video`) accept
 *  absolute URLs, bundle-relative paths (resolved against the package's bundle
 *  base, like `game-src`), and `data:` URIs whose MIME prefix is on the
 *  allow-list. The scalar types (`boolean` / `number` / `range` / `list`)
 *  behave exactly like their configuration counterparts and resolve to the
 *  typed value (a `boolean` stays `true`, a `number` stays `8`). */
export type SkinValueType = 'color' | 'image' | 'audio' | 'video' | 'boolean' | 'number' | 'range' | 'list';

/** Schema entry for a single skin key. Mirrors {@link ConfigSchemaEntry}:
 *  a bare type string (`"main_color": "color"`), an array-literal enum
 *  (`"pattern": ["dots","stripes"]`, short-form for `list`), or a full
 *  descriptor. `range` and `list` REQUIRE the full descriptor because they
 *  carry constraint data (bounds, enum); the others accept the bare descriptor. */
export type SkinSchemaEntry =
  | 'color' | 'image' | 'audio' | 'video' | 'boolean' | 'number'
  | readonly string[]
  | { type: 'color' | 'image' | 'audio' | 'video' | 'boolean' | 'number'; name?: string; description?: string }
  | { type: 'list'; values: readonly string[]; name?: string; description?: string }
  | { type: 'range'; min: number; max: number; step?: number; name?: string; description?: string };

/** One skin preset declared in `caputchin.json` under `skins.presets`.
 *  Underscore-prefixed keys are metadata; every other key is a typed value
 *  (color string or asset URL/path).
 *
 *  `_theme` is the mode the preset is eligible for: `light` shows only in
 *  light mode, `dark` only in dark, `any` works in both. Omitting `_theme`
 *  means `any` (the preset reads on either background). `_default: true`
 *  marks the preset as the default for the mode(s) it is eligible for, so an
 *  `any` default covers both light and dark. When more than one eligible
 *  preset is flagged default for a mode, declaration order wins (the first
 *  listed takes that mode), so an author can give a `dark` preset the dark
 *  slot and let an `any` preset fall through to light by listing the `dark`
 *  one first. `_extends` may target a preset name OR a mode shortcut (`light`
 *  / `dark`), which resolves to that mode's default preset. */
export interface SkinPreset {
  _theme?: 'light' | 'dark' | 'any';
  _default?: boolean;
  _extends?: string;
  [key: string]: string | boolean | number | undefined;
}

/** Final skin object the widget hands the game (as `ctx.skin`). `_extends` and
 *  `_default` are stripped during resolution; the flattened typed keys survive.
 *  Color values are strings and asset URLs are already resolved to absolute form
 *  (bundle-base relative paths joined; `data:` URIs verbatim). Scalar keys
 *  (`boolean` / `number` / `range` / `list`) arrive as their typed value, the
 *  same as `ResolvedConfig` (a `boolean` is `true`, a `number` is `8`); hence
 *  the value union widens to `string | boolean | number`. `_theme` is always the
 *  concrete mode the skin was resolved for (`light` or `dark`, never `any`): an
 *  `any` preset reports the visitor's actual mode so the surrounding chrome
 *  stays in step. */
export interface ResolvedSkin {
  _theme: 'light' | 'dark';
  [key: string]: string | boolean | number;
}
