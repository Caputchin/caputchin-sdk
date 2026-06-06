# Interface: GameManifest

The full package manifest the game ships in `caputchin.json`. This is the
 author + marketplace-indexer source of truth: the indexer reads the FILE
 server-side (preferred size, locale/skin/config presets, run artifact) and
 the server resolves + ships those down to the widget at runtime. It is NOT
 passed to `register`; the SDK never reads the manifest in the browser.

 The nested `marketplace` block is optional; games that only run on customer
 sites omit it. The `entry`/`npm` distribution fields support marketplace
 indexing. The `id` field is optional and unused by the SDK (see below).

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="configurations"></a> `configurations?` | `object` | - |
| `configurations.presets` | `Record`\<`string`, [`ConfigPreset`](Interface.ConfigPreset.md)\> | - |
| `configurations.schema?` | `Record`\<`string`, [`ConfigSchemaEntry`](TypeAlias.ConfigSchemaEntry.md)\> | Per-key type declaration. Drives runtime validation; mismatches surface as `invalid-config` events and the offending key falls through the `_extends` chain. |
| <a id="entry"></a> `entry?` | `string` | Path inside the repo / npm package to the built bundle. Used by the marketplace indexer alongside `npm` to resolve a jsDelivr URL. |
| <a id="id"></a> `id?` | `string` | Author-declared id. Optional and unused by the SDK; preserved here so manifests carrying a legacy `id` field continue to type-check. |
| <a id="license"></a> `license?` | `string` | Required for marketplace-indexable manifests: SPDX identifier or SPDX expression naming the license that covers the bundled code and assets. Must evaluate to an approved permissive identifier (whitelist published at caputchin.com/docs/marketplace/publish-failed-reference). Customer- hosted manifests may omit this field. |
| <a id="locales"></a> `locales?` | `object` | - |
| `locales.presets` | `Record`\<`string`, [`LocalePreset`](Interface.LocalePreset.md)\> | - |
| `locales.schema?` | `Record`\<`string`, [`LocaleKeySchema`](Interface.LocaleKeySchema.md)\> | Optional per-key documentation. Drives translator tooling and the future dashboard override editor. Not read at runtime. |
| <a id="marketplace"></a> `marketplace?` | [`MarketplaceMetadata`](Interface.MarketplaceMetadata.md) | Marketplace UI metadata. Absent on customer-hosted-only manifests. |
| <a id="minsolvems"></a> `minSolveMs?` | `number` | Minimum plausible human solve time, in milliseconds. The platform pins this (via the signed game-gate ticket) and rejects a `/verify/pass` whose real wall-clock elapsed time falls below it (a deterministic offline solver submits a finished round in roughly zero time). Set it conservatively per game, well under the slowest real player; the platform ships it in shadow (log-only) mode first to calibrate. Omit to apply no floor. |
| <a id="npm"></a> `npm?` | `string` | npm package coordinate. Used by the marketplace indexer to resolve a jsDelivr URL. Informational only at runtime. |
| <a id="preferred"></a> `preferred?` | [`PreferredPresentation`](Interface.PreferredPresentation.md) | Preferred presentation footprint (width / height). See [PreferredPresentation](Interface.PreferredPresentation.md). |
| <a id="run"></a> `run?` | `object` | Optional dedicated headless replay artifact. When present, the marketplace indexer vendors `run.entry` (+ each declared `run.modules`) alongside the playable bundle so the server can re-run the round under the issued seed. Omit to fall back to replaying the live `entry` bundle directly. `modules` lets a wasm-using game ship its `.wasm` files (and any helper `.js` chunks) as Worker-Loader module entries; the run entry imports each by `name`. Constraints enforced at index time: name must match `/^[a-zA-Z0-9_-]+\.(wasm|js)$/`, `type` matches the extension, reserved names `entry.js` / `artifact.js` are rejected, duplicates rejected, up to 16 entries. |
| `run.entry` | `string` | - |
| `run.modules?` | `object`[] | - |
| <a id="skins"></a> `skins?` | `object` | - |
| `skins.presets` | `Record`\<`string`, [`SkinPreset`](Interface.SkinPreset.md)\> | - |
| `skins.schema?` | `Record`\<`string`, [`SkinSchemaEntry`](TypeAlias.SkinSchemaEntry.md)\> | Per-key type declaration. Bare type-string and full descriptor forms are both legal in the same block. The widget validates each preset value against the declared type at resolve time; mismatches surface as `invalid-config` events and the offending key falls through the `_extends` chain. |
| <a id="terms_accepted"></a> `terms_accepted?` | `boolean` | Required for marketplace-indexable manifests: literal `true` indicates the publisher has read and accepts the Marketplace Submission Terms at caputchin.com/legal/submission-terms. Any other value (including missing) drops the manifest from the marketplace index. Customer-hosted manifests may omit this field. |
