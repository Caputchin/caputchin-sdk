import type { Seed } from '@caputchin/replay-contract';

export type { Seed } from '@caputchin/replay-contract';

/** How the widget presents the game: `inline` (an in-flow panel), `modal` (an
 *  overlay dialog), or `fullscreen` (a full-viewport overlay). */
export type Layout = 'inline' | 'modal' | 'fullscreen';

/** The control surface the widget hands your game factory (second argument).
 *  Use it to report a completed round, surface an error, or resize the frame.
 *  The widget owns the verification flow; the bridge is how your game talks
 *  back to it. */
export interface Bridge {
  /**
   * Signal a completed round by handing the widget the OPAQUE TRACE of the
   * play. The trace is a serialized string the game alone defines
   * (the recorded inputs); the server re-runs the game's `run(seed, trace)` to
   * compute the authoritative verdict - the game does NOT report a score here.
   * Seed the run from `ctx.seed` so the live play and the server replay agree.
   * (The score, if any, is the game's own in-iframe UI concern.)
   */
  pass(result: { trace: string }): void;
  error(err: { code: string; message?: string }): void;
  /** Tell the widget to resize the iframe to fit the game's content. Use
   *  this when your game can compute its viewport but doesn't use an
   *  intrinsic-sized root element (e.g. CSS-percentage layouts that auto-
   *  measure can't infer). The widget also auto-measures the game's first
   *  child after factory runs; this is the explicit escape hatch.
   *
   *  Call AFTER your first paint. Calling repeatedly mid-session works but
   *  is discouraged; viewport changes during play are an antipattern. */
  setSize(width: number, height: number): void;
  readonly layout: Layout | null;
}

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

/** Per-session context the widget passes to the game factory as a third arg. */
export interface GameContext {
  /** Per-round replay seed: server-derived, the same value the server
   *  re-derives at replay. Seed all game randomness from it (e.g.
   *  `cap.rng(seed)`) so the live play is replayable. Null when the widget runs
   *  the game outside a verified session (no seed issued). */
  seed: Seed | null;
  locale: ResolvedLocale | null;
  skin: ResolvedSkin | null;
  config: ResolvedConfig | null;
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

/** Marketplace-discovery metadata block in `caputchin.json`. Presence of
 *  this block is the "yes, please index this" signal - a manifest with
 *  runtime blocks but no `marketplace` object is a valid customer-hosted
 *  game that the marketplace simply ignores. None of these fields are read
 *  at runtime by the widget or the SDK; they drive the marketplace card
 *  + browse filters and the indexer's bundle-URL resolution. */
export interface MarketplaceMetadata {
  name?: string;
  description?: string;
  version?: string;
  preview?: string;
  /** Optional author block. Each subfield is optional. `name` and `url` may
   *  render on the marketplace detail page as an author byline. `email` is
   *  never shown publicly; the platform uses it only to notify the author
   *  when the daily index run fails to register their game. Omit the whole
   *  block to fall back to the GitHub owner for display and to receive no
   *  failure notifications. */
  author?: {
    name?: string;
    url?: string;
    email?: string;
  };
  support?: {
    responsive?: boolean;
    touch?: boolean;
    accessible?: boolean;
    audio?: string;
    [k: string]: unknown;
  };
}

/** The game's preferred presentation, declared under `preferred` in
 *  `caputchin.json`. Every key is an advisory hint the host MAY honor, not a
 *  hard requirement.
 *
 *  `width` / `height`: the widget sizes the iframe to these when the customer
 *  leaves the embed's `width` / `height` unset (a `full` customer value
 *  stretches that axis instead). Omit to fall back to the widget's built-in
 *  default footprint.
 *
 *  `layout`: the shell the widget builds around the game (an inline panel, a
 *  modal dialog, or a fullscreen overlay). The widget uses it only when the
 *  embed leaves `layout` unset (the default `auto`); an explicit embed
 *  `layout` overrides it. Resolution order: embed `layout` attribute, then this
 *  preferred layout, then `inline`. Honored only for games the platform
 *  resolves server-side (marketplace games, or a game id given without a site
 *  key); a customer-hosted `game-src` bundle the platform cannot read ahead of
 *  mount ignores this hint, the same way it ignores the preferred footprint. */
export interface PreferredPresentation {
  width?: number;
  height?: number;
  layout?: Layout;
}

/** The full package manifest the game ships in `caputchin.json`. This is the
 *  author + marketplace-indexer source of truth: the indexer reads the FILE
 *  server-side (preferred size, locale/skin/config presets, run artifact) and
 *  the server resolves + ships those down to the widget at runtime. It is NOT
 *  passed to `register`; the SDK never reads the manifest in the browser.
 *
 *  The nested `marketplace` block is optional; games that only run on customer
 *  sites omit it. The `entry`/`npm` distribution fields support marketplace
 *  indexing. The `id` field is optional and unused by the SDK (see below). */
export interface GameManifest {
  /** Marketplace UI metadata. Absent on customer-hosted-only manifests. */
  marketplace?: MarketplaceMetadata;
  /** Required for marketplace-indexable manifests: literal `true` indicates
   *  the publisher has read and accepts the Marketplace Submission Terms at
   *  caputchin.com/legal/submission-terms. Any other value (including
   *  missing) drops the manifest from the marketplace index. Customer-hosted
   *  manifests may omit this field. */
  terms_accepted?: boolean;
  /** Required for marketplace-indexable manifests: SPDX identifier or SPDX
   *  expression naming the license that covers the bundled code and assets.
   *  Must evaluate to an approved permissive identifier (whitelist published
   *  at caputchin.com/docs/marketplace/publish-failed-reference). Customer-
   *  hosted manifests may omit this field. */
  license?: string;
  /** npm package coordinate. Used by the marketplace indexer to resolve a
   *  jsDelivr URL. Informational only at runtime. */
  npm?: string;
  /** Path inside the repo / npm package to the built bundle. Used by the
   *  marketplace indexer alongside `npm` to resolve a jsDelivr URL. */
  entry?: string;
  /** Optional dedicated headless replay artifact. When present, the
   *  marketplace indexer vendors `run.entry` (+ each declared `run.modules`)
   *  alongside the playable bundle so the server can re-run the round under
   *  the issued seed. Omit to fall back to replaying the live `entry` bundle
   *  directly. `modules` lets a wasm-using game ship its `.wasm` files (and
   *  any helper `.js` chunks) as Worker-Loader module entries; the run entry
   *  imports each by `name`. Constraints enforced at index time: name must
   *  match `/^[a-zA-Z0-9_-]+\.(wasm|js)$/`, `type` matches the extension,
   *  reserved names `entry.js` / `artifact.js` are rejected, duplicates
   *  rejected, up to 16 entries. */
  run?: {
    entry: string;
    modules?: { name: string; type: "wasm" | "js"; path: string }[];
  };
  /** Author-declared id. Optional and unused by the SDK; preserved here so
   *  manifests carrying a legacy `id` field continue to type-check. */
  id?: string;
  /** Preferred presentation footprint (width / height). See
   *  {@link PreferredPresentation}. */
  preferred?: PreferredPresentation;
  locales?: {
    /** Optional per-key documentation. Drives translator tooling and the
     *  future dashboard override editor. Not read at runtime. */
    schema?: Record<string, LocaleKeySchema>;
    presets: Record<string, LocalePreset>;
  };
  skins?: {
    /** Per-key type declaration. Bare type-string and full descriptor forms
     *  are both legal in the same block. The widget validates each preset
     *  value against the declared type at resolve time; mismatches surface
     *  as `invalid-config` events and the offending key falls through the
     *  `_extends` chain. */
    schema?: Record<string, SkinSchemaEntry>;
    presets: Record<string, SkinPreset>;
  };
  configurations?: {
    /** Per-key type declaration. Drives runtime validation; mismatches
     *  surface as `invalid-config` events and the offending key falls
     *  through the `_extends` chain. */
    schema?: Record<string, ConfigSchemaEntry>;
    presets: Record<string, ConfigPreset>;
  };
}

/* ---------------------------------------------------------------------------
 * Split shell files: the optional `.caputchin/` folder
 *
 * The three shell axes (`locales`, `skins`, `configurations`) dominate a game's
 * `caputchin.json` (11 locale presets alone push it past 500 lines). As a
 * leaner authoring alternative, any of them may instead live in its own file
 * under a `.caputchin/` folder at the game root:
 *
 *   .caputchin/locales.json         <- the `locales` block
 *   .caputchin/skins.json           <- the `skins` block
 *   .caputchin/configurations.json  <- the `configurations` block
 *
 * Each file's top-level object IS the axis block (`{ schema?, presets }`). All
 * three are optional; none, one, or more may exist, and `caputchin.json` stays
 * fully valid with the axes inline.
 *
 * Precedence is whole-axis replace, `caputchin.json` wins: if an axis is
 * declared in BOTH `caputchin.json` and `.caputchin/<axis>.json`, the inline
 * block is used and the file is ignored entirely (the publish flow surfaces a
 * warning so you know the file was dead). An axis therefore lives entirely in
 * one place; do not split a single axis across both (schema inline + presets in
 * the file is unsupported).
 *
 * Author a split file with a `satisfies` import for type-checking, e.g.
 *
 *   import type { LocalesFile } from '@caputchin/game-sdk';
 *   export default { schema: { ... }, presets: { ... } } satisfies LocalesFile;
 * ------------------------------------------------------------------------- */

/** Contents of `.caputchin/locales.json` (the `locales` block of {@link GameManifest}). */
export type LocalesFile = NonNullable<GameManifest['locales']>;

/** Contents of `.caputchin/skins.json` (the `skins` block of {@link GameManifest}). */
export type SkinsFile = NonNullable<GameManifest['skins']>;

/** Contents of `.caputchin/configurations.json` (the `configurations` block of {@link GameManifest}). */
export type ConfigurationsFile = NonNullable<GameManifest['configurations']>;

/** The function you hand to {@link register}. The widget calls it once per
 *  mount with the `container` element to render into, the {@link Bridge}
 *  control surface, and the per-session {@link GameContext} (seed, locale,
 *  skin, config). Return an optional cleanup function the widget calls when the
 *  round tears down. */
export type GameFactory = (
  container: HTMLElement,
  bridge: Bridge,
  ctx?: GameContext,
) => (() => void) | void;

type Caputchin = {
  games: Record<string, GameFactory>;
};

/** Fallback registry key used when no `data-game-id` is available on the
 *  iframe runtime script tag. Each iframe only ever loads one game, so a
 *  single fixed slot is enough. Exported so the widget's iframe runtime +
 *  tests can reference the same constant. */
export const DEFAULT_REGISTRY_KEY = '__caputchin_default__';

/** Resolve the registry key the SDK stores the factory under:
 *
 *   1. `<script data-game-id="…">` in the current document (the iframe
 *      runtime sets this from the widget's `game` attribute).
 *   2. {@link DEFAULT_REGISTRY_KEY} as a final fallback. */
function resolveRegistryKey(): string {
  if (typeof document !== 'undefined') {
    const tag = document.querySelector('script[data-game-id]');
    const attr = tag ? tag.getAttribute('data-game-id') : null;
    if (attr && attr.length > 0) return attr;
  }
  return DEFAULT_REGISTRY_KEY;
}

/** Register the game's factory with the iframe's Caputchin global; the widget
 *  iframe runtime invokes it on kickoff. No manifest is passed: the SERVER
 *  resolves presets + the preferred footprint (from the indexed `caputchin.json`
 *  / dashboard-authored schemas) and ships them down via the bootstrap +
 *  kickoff message, so the in-frame manifest is never read at runtime. The
 *  `caputchin.json` file stays the author + marketplace-indexer source of truth
 *  (typed by {@link GameManifest}); it just isn't handed to `register`. */
export function register(factory: GameFactory): void {
  const key = resolveRegistryKey();

  const g = globalThis as Record<string, unknown>;

  if (!g['Caputchin']) {
    console.warn(
      '[caputchin/game-sdk] Caputchin global not found; was the SDK loaded outside a Caputchin iframe?',
    );
    g['Caputchin'] = { games: {} } satisfies Caputchin;
  }

  const caputchin = g['Caputchin'] as Caputchin;
  if (!caputchin.games) caputchin.games = {};

  if (Object.prototype.hasOwnProperty.call(caputchin.games, key)) {
    console.warn(`[caputchin/game-sdk] duplicate registry key "${key}"; last-write-wins`);
  }

  caputchin.games[key] = factory;
}
