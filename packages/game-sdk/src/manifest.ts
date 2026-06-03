import type { Layout } from './layout';
import type { LocaleKeySchema, LocalePreset } from './locale';
import type { SkinPreset, SkinSchemaEntry } from './skin';
import type { ConfigPreset, ConfigSchemaEntry } from './config';

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
 *  stretches that axis instead). Each is a positive pixel count, or the literal
 *  `"full"` to stretch that axis to fill the parent (the same effect an embed
 *  `width="full"` has, applied only when the embed leaves that axis unset). Omit
 *  to fall back to the widget's built-in default footprint.
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
  width?: number | 'full';
  height?: number | 'full';
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
