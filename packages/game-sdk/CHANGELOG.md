# Changelog

## [3.2.0](https://github.com/Caputchin/caputchin-sdk/compare/game-sdk-v3.1.0...game-sdk-v3.2.0) (2026-06-07)


### Features

* **sdk:** gameplay bot-resistance kit helpers + minSolveMs manifest field ([ac021ce](https://github.com/Caputchin/caputchin-sdk/commit/ac021cec3526df6a812c01d81c4e29e7c4ae5e9e))

## [3.1.0](https://github.com/Caputchin/caputchin-sdk/compare/game-sdk-v3.0.0...game-sdk-v3.1.0) (2026-06-04)


### Features

* **game-sdk:** add makeNow + randomSeed helpers ([6d1f1c8](https://github.com/Caputchin/caputchin-sdk/commit/6d1f1c84b11a8072c55aea53d63398d72390bf24))

## [3.0.0](https://github.com/Caputchin/caputchin-sdk/compare/game-sdk-v2.1.0...game-sdk-v3.0.0) (2026-06-01)


### ⚠ BREAKING CHANGES

* **game-sdk:** allow scalar skin field types (boolean/number/range/list), resolved typed
* **game-sdk:** register() takes only the factory; drop the vestigial manifest arg
* marketplace.author block supersedes author_email
* **sdk:** seed-in/trace-out replay contract across game-sdk + widget (ADR-0069)

### Features

* **game-sdk:** allow scalar skin field types (boolean/number/range/list), resolved typed ([6abaace](https://github.com/Caputchin/caputchin-sdk/commit/6abaace7f204000f53ace128f9657343420d5ff4))
* **game-sdk:** export LocalesFile/SkinsFile/ConfigurationsFile types for .caputchin/ split files ([5d2ad95](https://github.com/Caputchin/caputchin-sdk/commit/5d2ad956256c1eaf8fcc7aa91deae6c5e4041176))
* **game-sdk:** optional marketplace.author_email for verification-fail notifications ([7bd5594](https://github.com/Caputchin/caputchin-sdk/commit/7bd5594b115d863c02438cc728b5099ea1c407e4))
* **game-sdk:** register() takes only the factory; drop the vestigial manifest arg ([a0a95ad](https://github.com/Caputchin/caputchin-sdk/commit/a0a95addcb73784649836cf7241aa2b80723eab1))
* **game-sdk:** support _theme "any" for skins that work in both light and dark ([7bc20d1](https://github.com/Caputchin/caputchin-sdk/commit/7bc20d1630e2fac0aa5ca1b5353bb635d34a2bae))
* **game-sdk:** type the optional run + run.modules block on GameManifest ([a44c2c6](https://github.com/Caputchin/caputchin-sdk/commit/a44c2c623597e566fbe1afae6b7c4dec3dad03b6))
* marketplace.author block supersedes author_email ([a688f68](https://github.com/Caputchin/caputchin-sdk/commit/a688f68e2a629adcc61186784c52a04df512843b))
* **sdk:** honor game manifest preferred.layout in widget when embed layout unset ([303cad3](https://github.com/Caputchin/caputchin-sdk/commit/303cad33f5363f551154bdd3a8e492e123a25d28))
* **sdk:** seed-in/trace-out replay contract across game-sdk + widget (ADR-0069) ([54a9e2c](https://github.com/Caputchin/caputchin-sdk/commit/54a9e2c25b9ccae8d9b7ef50fe7f26424499a1ce))
* **widget:** honor preferred.width/height "full" footprint from caputchin.json ([559e68c](https://github.com/Caputchin/caputchin-sdk/commit/559e68c67785c58df79f9df135ad09b6204e6a53))

## [2.1.0](https://github.com/Caputchin/caputchin-sdk/compare/game-sdk-v2.0.0...game-sdk-v2.1.0) (2026-05-24)


### Features

* **sdk:** publish the renamed _lang locale metadata key ([3d7eac2](https://github.com/Caputchin/caputchin-sdk/commit/3d7eac24586079ff5580cb940bf5069d7174910f))

## [2.0.0](https://github.com/Caputchin/caputchin-sdk/compare/game-sdk-v1.0.0...game-sdk-v2.0.0) (2026-05-23)


### ⚠ BREAKING CHANGES

* **game-sdk:** nest manifest preferred footprint as {width,height}, drop flat fields
* **game-sdk:** rename language axis to locale and skin _mode to _theme
* **sdk:** derive registry key from data-game-id; drop required manifest.id
* **sdk:** languages presets pipeline (game-sdk 2.0 + widget 2.0)

### Features

* **game-sdk:** nest manifest preferred footprint as {width,height}, drop flat fields ([9c692b6](https://github.com/Caputchin/caputchin-sdk/commit/9c692b65a8165f9b17c03fe0bb8ca8354482143e))
* **game-sdk:** rename language axis to locale and skin _mode to _theme ([7bb356a](https://github.com/Caputchin/caputchin-sdk/commit/7bb356a54baa5290ee84945f0c7b09f10e6aa13b))
* **sdk:** add optional languages.schema for per-key docs + tokens ([a3650c2](https://github.com/Caputchin/caputchin-sdk/commit/a3650c226c8194a1fe3ea5c36f47011520a77c4e))
* **sdk:** derive registry key from data-game-id; drop required manifest.id ([7c5e6d0](https://github.com/Caputchin/caputchin-sdk/commit/7c5e6d03632983cfc029da67b24c8736b2262554))
* **sdk:** languages presets pipeline (game-sdk 2.0 + widget 2.0) ([e5b91b4](https://github.com/Caputchin/caputchin-sdk/commit/e5b91b4a8b73101f0fe0a590fc5426932b29b062))
* **widget,game-sdk:** auto-measure game's first-rendered child via ResizeObserver + bridge.setSize(w,h) escape hatch; widget re-applies iframe size from dimensions-measured message ([f0bb3fb](https://github.com/Caputchin/caputchin-sdk/commit/f0bb3fb0a6784ac46619e9dcd35452791bcffce0))
* **widget:** &lt;caputchin-widget&gt; lang attr; chrome→shell; inline JSON shell signals; height=full ([1c6ba21](https://github.com/Caputchin/caputchin-sdk/commit/1c6ba21125e46c7beede4c670c76cc3dff40e732))
* **widget:** add 3-layout system (inline/modal/fullscreen) with auto resolution and trigger checkbox ([07ae0e5](https://github.com/Caputchin/caputchin-sdk/commit/07ae0e526838682fb91b7a1c4073cd0fd0df7c16))
* **widget:** configurations axis with valibot-backed type validation + brand link wiring ([228e588](https://github.com/Caputchin/caputchin-sdk/commit/228e5889f2daf153d53a38ffa24ba4ab4ac59691))
* **widget:** game preferred dimensions in manifest; width/height attrs accept px to override ([c215a97](https://github.com/Caputchin/caputchin-sdk/commit/c215a97e390f336e4de23a7f35b6c4b8afd0be72))
* **widget:** skin axis with built-in light/dark + typed asset validation + ctx.skin ([a3af1c0](https://github.com/Caputchin/caputchin-sdk/commit/a3af1c01e5ce313686b96c0655621dc28edf5999))


### Reverts

* release-please PR [#10](https://github.com/Caputchin/caputchin-sdk/issues/10) due to broken title pattern config ([52b9413](https://github.com/Caputchin/caputchin-sdk/commit/52b9413168769ade1b94f31ad091403e81481317))

## 2.0.0 (2026-05-20)


### ⚠ BREAKING CHANGES

* **game-sdk:** `register()` now takes a `GameManifest` object as its first argument instead of `(id, factory, opts?)`. Authors must import `caputchin.json` and pass it to `register`: `register(manifest, factory)`. `RegisterOptions` is removed; `preferredLayout` / `preferredWidth` / `preferredHeight` now live on the manifest top-level.
* **game-sdk:** `GameFactory` gains an optional third argument `ctx: GameContext`, currently `{ lang: ResolvedLanguage | null }`. Two-arg factories continue to work.
* **game-sdk:** The `Caputchin` global shape changes from `{ games, gameOpts }` to `{ games, manifests }`.


### Features

* **game-sdk:** add `GameManifest`, `LanguagePreset`, `ResolvedLanguage`, `GameContext` types backing the manifest-driven registration and the languages presets pipeline.

## 1.0.0 (2026-05-13)


### ⚠ BREAKING CHANGES

* **sdk:** rename bridge.complete to bridge.pass for success-only semantics

### Features

* **ci:** add CI workflow with codecov coverage upload ([727ad0d](https://github.com/Caputchin/caputchin-sdk/commit/727ad0dd8c7f1d98d4945269a906636b2c76da52))
* **frontend:** scaffold @caputchin/widget and @caputchin/game-sdk skeleton packages ([ef9d444](https://github.com/Caputchin/caputchin-sdk/commit/ef9d44434bd76a4168df6cb4f9ac99b8666bc579))
* **game-sdk:** add vitest + happy-dom tests with 100% coverage ([7a6dd4c](https://github.com/Caputchin/caputchin-sdk/commit/7a6dd4cac9df90e459bd7c54b424c9fa5e76c770))
* **game-sdk:** rewrite to push-only Bridge contract ([2bcbfa3](https://github.com/Caputchin/caputchin-sdk/commit/2bcbfa330a07f753811622a4c11245b256da8578))


### Code Refactoring

* **sdk:** rename bridge.complete to bridge.pass for success-only semantics ([fc384c5](https://github.com/Caputchin/caputchin-sdk/commit/fc384c586203d7dc47f34e3417ef814c601662ce))
