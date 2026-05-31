# @caputchin/game-sdk

## Interfaces

| Interface | Description |
| ------ | ------ |
| [Bridge](Interface.Bridge.md) | - |
| [ConfigPreset](Interface.ConfigPreset.md) | One configuration preset declared in `caputchin.json` under `configurations.presets`. Underscore-prefixed keys are metadata; every other key is a typed value. Unlike skins / langs, the value can be a boolean or a number (not just a string). |
| [GameContext](Interface.GameContext.md) | Per-session context the widget passes to the game factory as a third arg. |
| [GameManifest](Interface.GameManifest.md) | The full package manifest the game ships in `caputchin.json`. This is the author + marketplace-indexer source of truth: the indexer reads the FILE server-side (preferred size, locale/skin/config presets, run artifact) and the server resolves + ships those down to the widget at runtime. It is NOT passed to `register`; the SDK never reads the manifest in the browser. |
| [LocaleKeySchema](Interface.LocaleKeySchema.md) | Documentation entry for a single text key in `locales.presets`. Optional and additive: omitting `schema` entirely or omitting individual keys does not affect resolution. Schema is consumed by author tooling, translator workflows, and the future per-site-key override dashboard; the widget runtime ignores it. |
| [LocalePreset](Interface.LocalePreset.md) | One locale preset declared in `caputchin.json` under `locales.presets`. Underscore-prefixed keys are metadata; every other key is a translatable text token. A locale carries a `_lang` BCP-47 language tag; multiple presets may share a `_lang` (e.g. two English copy variants). Direction can be omitted and is auto-derived from `_lang` when the language is in the RTL set (ar, he, fa, ur, yi, ps, sd). |
| [MarketplaceMetadata](Interface.MarketplaceMetadata.md) | Marketplace-discovery metadata block in `caputchin.json`. Presence of this block is the "yes, please index this" signal - a manifest with runtime blocks but no `marketplace` object is a valid customer-hosted game that the marketplace simply ignores. None of these fields are read at runtime by the widget or the SDK; they drive the marketplace card + browse filters and the indexer's bundle-URL resolution. |
| [PreferredPresentation](Interface.PreferredPresentation.md) | The game's preferred presentation, declared under `preferred` in `caputchin.json`. Every key is an advisory hint the host MAY honor, not a hard requirement. |
| [ResolvedConfig](Interface.ResolvedConfig.md) | Final configuration object the widget hands the game. `_extends` and `_default` are stripped during resolution; only the flattened typed values survive. |
| [ResolvedLocale](Interface.ResolvedLocale.md) | Final locale object the widget hands the game. `_extends` and `_default` are stripped during resolution; only metadata (`_lang`, `_direction`) and text tokens survive. The language-tag key was renamed from `_iso` to `_lang` after v2.0.0; read `_lang`. |
| [ResolvedSkin](Interface.ResolvedSkin.md) | Final skin object the widget hands the game. `_extends` and `_default` are stripped during resolution; `_theme` plus the flattened typed keys survive. Asset URLs are already resolved to absolute form (bundle-base relative paths joined; `data:` URIs verbatim). |
| [SkinPreset](Interface.SkinPreset.md) | One skin preset declared in `caputchin.json` under `skins.presets`. Underscore-prefixed keys are metadata; every other key is a typed value (color string or asset URL/path). `_theme` defaults to `light` when absent. `_extends` may target a preset name OR a theme shortcut (`light` / `dark`) - the theme form resolves to that theme's `_default:true` preset. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ConfigSchemaEntry](TypeAlias.ConfigSchemaEntry.md) | Schema entry for a single configuration key. Three legal shapes: |
| [ConfigurationsFile](TypeAlias.ConfigurationsFile.md) | Contents of `.caputchin/configurations.json` (the `configurations` block of [GameManifest](Interface.GameManifest.md)). |
| [ConfigValueType](TypeAlias.ConfigValueType.md) | Value type a configuration key may carry. Drives the resolver's per-value validator (URL parse for `link`, finite-number check for `number` / `range`, enum-membership for `list`, literal `true`/`false` for `boolean`, non-empty for `string`). |
| [GameFactory](TypeAlias.GameFactory.md) | - |
| [Layout](TypeAlias.Layout.md) | - |
| [LocalesFile](TypeAlias.LocalesFile.md) | Contents of `.caputchin/locales.json` (the `locales` block of [GameManifest](Interface.GameManifest.md)). |
| [Seed](TypeAlias.Seed.md) | The replay seed: the low 128 bits of `SHA-256(sessionId : gameId : roundIndex)`, carried as four unsigned 32-bit words, most-significant word first. |
| [SkinSchemaEntry](TypeAlias.SkinSchemaEntry.md) | Schema entry for a single skin key. Bare type string short-form (`"main_color": "color"`) and full descriptor (`{ type, name, description }`) are both legal in the same `skins.schema` block. |
| [SkinsFile](TypeAlias.SkinsFile.md) | Contents of `.caputchin/skins.json` (the `skins` block of [GameManifest](Interface.GameManifest.md)). |
| [SkinValueType](TypeAlias.SkinValueType.md) | Value type a skin key may carry. Drives the resolver's per-value validator (allow-list of formats / mimetypes) and the widget shell's authoring tooling. `color` accepts hex (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`) and functional `rgb(...)` / `rgba(...)`. Asset types accept absolute URLs, bundle-relative paths (resolved against the package's bundle base, like `game-src`), and `data:` URIs whose MIME prefix is on the allow-list. |

## Variables

| Variable | Description |
| ------ | ------ |
| [DEFAULT\_REGISTRY\_KEY](Variable.DEFAULT_REGISTRY_KEY.md) | Fallback registry key used when no `data-game-id` is available on the iframe runtime script tag. Each iframe only ever loads one game, so a single fixed slot is enough. Exported so the widget's iframe runtime + tests can reference the same constant. |

## Functions

| Function | Description |
| ------ | ------ |
| [register](Function.register.md) | Register the game's factory with the iframe's Caputchin global; the widget iframe runtime invokes it on kickoff. No manifest is passed: the SERVER resolves presets + the preferred footprint (from the indexed `caputchin.json` / dashboard-authored schemas) and ships them down via the bootstrap + kickoff message, so the in-frame manifest is never read at runtime. The `caputchin.json` file stays the author + marketplace-indexer source of truth (typed by [GameManifest](Interface.GameManifest.md)); it just isn't handed to `register`. |
