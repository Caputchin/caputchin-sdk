import type { Seed } from '@caputchin/replay-contract';

export type { Seed } from '@caputchin/replay-contract';

export type Layout = 'inline' | 'modal' | 'fullscreen';

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

/** Value type a skin key may carry. Drives the resolver's per-value validator
 *  (allow-list of formats / mimetypes) and the widget shell's authoring
 *  tooling. `color` accepts hex (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`) and
 *  functional `rgb(...)` / `rgba(...)`. Asset types accept absolute URLs,
 *  bundle-relative paths (resolved against the package's bundle base, like
 *  `game-src`), and `data:` URIs whose MIME prefix is on the allow-list. */
export type SkinValueType = 'color' | 'image' | 'audio' | 'video';

/** Schema entry for a single skin key. Bare type string short-form
 *  (`"main_color": "color"`) and full descriptor (`{ type, name, description }`)
 *  are both legal in the same `skins.schema` block. */
export type SkinSchemaEntry =
  | SkinValueType
  | { type: SkinValueType; name?: string; description?: string };

/** One skin preset declared in `caputchin.json` under `skins.presets`.
 *  Underscore-prefixed keys are metadata; every other key is a typed value
 *  (color string or asset URL/path). `_theme` defaults to `light` when
 *  absent. `_extends` may target a preset name OR a theme shortcut (`light` /
 *  `dark`) - the theme form resolves to that theme's `_default:true` preset. */
export interface SkinPreset {
  _theme?: 'light' | 'dark';
  _default?: boolean;
  _extends?: string;
  [key: string]: string | boolean | undefined;
}

/** Final skin object the widget hands the game. `_extends` and `_default`
 *  are stripped during resolution; `_theme` plus the flattened typed keys
 *  survive. Asset URLs are already resolved to absolute form (bundle-base
 *  relative paths joined; `data:` URIs verbatim). */
export interface ResolvedSkin {
  _theme: 'light' | 'dark';
  [key: string]: string;
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

/** The game's preferred presentation footprint, declared under `preferred`
 *  in `caputchin.json`. Both keys are hints the host MAY honor, not hard
 *  requirements: the widget sizes the iframe to `width` / `height` when the
 *  customer leaves the embed's `width` / `height` unset (a `full` customer
 *  value stretches that axis instead). Omit to fall back to the widget's
 *  built-in default footprint.
 *
 *  NOTE: a preferred *layout* (inline / modal / fullscreen) is intentionally
 *  NOT part of this MVP surface - honoring it needs a pre-mount channel the
 *  widget does not have today. That capability is designed and deferred. */
export interface PreferredPresentation {
  width?: number;
  height?: number;
}

/** The full package manifest the game ships in `caputchin.json`. This is the
 *  author + marketplace-indexer source of truth: the indexer reads the FILE
 *  server-side (preferred size, locale/skin/config presets, run artifact) and
 *  the server resolves + ships those down to the widget at runtime. It is NOT
 *  passed to `register` — the SDK never reads the manifest in the browser.
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
