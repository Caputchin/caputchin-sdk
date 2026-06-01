# Changelog

## [4.0.0](https://github.com/Caputchin/caputchin-sdk/compare/game-sdk-v3.0.0...game-sdk-v4.0.0) (2026-06-01)


### ⚠ BREAKING CHANGES

* **game-sdk:** allow scalar skin field types (boolean/number/range/list), resolved typed
* **game-sdk:** register() takes only the factory; drop the vestigial manifest arg
* marketplace.author block supersedes author_email
* **sdk:** seed-in/trace-out replay contract across game-sdk + widget (ADR-0069)
* **game-sdk:** nest manifest preferred footprint as {width,height}, drop flat fields
* **game-sdk:** rename language axis to locale and skin _mode to _theme
* **sdk:** derive registry key from data-game-id; drop required manifest.id (ADR-0058)
* **sdk:** languages presets pipeline (game-sdk 2.0 + widget 2.0)
* **sdk:** rename bridge.complete to bridge.pass for success-only semantics

### Features

* **ci:** add CI workflow with codecov coverage upload ([727ad0d](https://github.com/Caputchin/caputchin-sdk/commit/727ad0dd8c7f1d98d4945269a906636b2c76da52))
* **frontend:** scaffold @caputchin/widget and @caputchin/game-sdk skeleton packages ([ef9d444](https://github.com/Caputchin/caputchin-sdk/commit/ef9d44434bd76a4168df6cb4f9ac99b8666bc579))
* **game-sdk:** add vitest + happy-dom tests with 100% coverage ([7a6dd4c](https://github.com/Caputchin/caputchin-sdk/commit/7a6dd4cac9df90e459bd7c54b424c9fa5e76c770))
* **game-sdk:** allow scalar skin field types (boolean/number/range/list), resolved typed ([84c1a2b](https://github.com/Caputchin/caputchin-sdk/commit/84c1a2b490e384e694f1a8c0d0d5d4030b064158))
* **game-sdk:** export LocalesFile/SkinsFile/ConfigurationsFile types for .caputchin/ split files ([5edcc10](https://github.com/Caputchin/caputchin-sdk/commit/5edcc10a1e8cddee2d960e38ce21c9df48074838))
* **game-sdk:** nest manifest preferred footprint as {width,height}, drop flat fields ([ca8a1ac](https://github.com/Caputchin/caputchin-sdk/commit/ca8a1ac448f807a0f819814cbc3b1b95bcce639c))
* **game-sdk:** optional marketplace.author_email for verification-fail notifications ([3ecad68](https://github.com/Caputchin/caputchin-sdk/commit/3ecad685a83990552215a399f33e26c20ab5b7ab))
* **game-sdk:** register() takes only the factory; drop the vestigial manifest arg ([0d28eed](https://github.com/Caputchin/caputchin-sdk/commit/0d28eed32557655477eb60502026c52d51225abc))
* **game-sdk:** rename language axis to locale and skin _mode to _theme ([2bd672c](https://github.com/Caputchin/caputchin-sdk/commit/2bd672c5c761e7ea92b60472efbc0b872d820ef5))
* **game-sdk:** rewrite to push-only Bridge contract per ADR-0015 ([2bcbfa3](https://github.com/Caputchin/caputchin-sdk/commit/2bcbfa330a07f753811622a4c11245b256da8578))
* **game-sdk:** support _theme "any" for skins that work in both light and dark ([ac356ca](https://github.com/Caputchin/caputchin-sdk/commit/ac356ca2f3f9b94388a16d2a7ee3a3f74b16c5f1))
* **game-sdk:** type the optional run + run.modules block on GameManifest ([9b0ce12](https://github.com/Caputchin/caputchin-sdk/commit/9b0ce12a2f3aeac5605a10f4704c0c101e37d56f))
* marketplace.author block supersedes author_email ([5143235](https://github.com/Caputchin/caputchin-sdk/commit/514323522e0d999d11f173422bfa3f97829e01cb))
* **sdk:** add optional languages.schema for per-key docs + tokens ([4d04124](https://github.com/Caputchin/caputchin-sdk/commit/4d04124cbd822dc32be7f3cfc7d344c747c97446))
* **sdk:** derive registry key from data-game-id; drop required manifest.id (ADR-0058) ([79c6123](https://github.com/Caputchin/caputchin-sdk/commit/79c61231899ce9a07db18101373b1eec517daea5))
* **sdk:** honor game manifest preferred.layout in widget when embed layout unset ([487ecd6](https://github.com/Caputchin/caputchin-sdk/commit/487ecd6601c076c36f858c2d876e8ea040f3584a))
* **sdk:** languages presets pipeline (game-sdk 2.0 + widget 2.0) ([0df53ac](https://github.com/Caputchin/caputchin-sdk/commit/0df53ac520e4fac7d11dfb23c0a2e74bdcb909f2))
* **sdk:** publish the renamed _lang locale metadata key ([45d5a8e](https://github.com/Caputchin/caputchin-sdk/commit/45d5a8ee2016abc1edb8a64b590396c455051dc8))
* **sdk:** seed-in/trace-out replay contract across game-sdk + widget (ADR-0069) ([27733ce](https://github.com/Caputchin/caputchin-sdk/commit/27733ce81ce16e781a5c4d5e4e3fc56dd201e1e2))
* **widget,game-sdk:** auto-measure game's first-rendered child via ResizeObserver + bridge.setSize(w,h) escape hatch; widget re-applies iframe size from dimensions-measured message ([e500aeb](https://github.com/Caputchin/caputchin-sdk/commit/e500aebfe503881982519af119060225429051a9))
* **widget:** &lt;caputchin-widget&gt; lang attr; chrome→shell; inline JSON shell signals; height=full ([973807d](https://github.com/Caputchin/caputchin-sdk/commit/973807d9b8696afe7c18ed7a39192a787d25000d))
* **widget:** add 3-layout system (inline/modal/fullscreen) with auto resolution and trigger checkbox ([faa27c5](https://github.com/Caputchin/caputchin-sdk/commit/faa27c50bf18cd4765d04b0b3dcd9d0acdbee215))
* **widget:** configurations axis with valibot-backed type validation + brand link wiring ([407c979](https://github.com/Caputchin/caputchin-sdk/commit/407c9798059125da3390e2b3a044c8c2c1314fde))
* **widget:** game preferred dimensions in manifest; width/height attrs accept px to override ([570a986](https://github.com/Caputchin/caputchin-sdk/commit/570a9869653dc6eea3d3f5c52647c16f66ed14ef))
* **widget:** honor preferred.width/height "full" footprint from caputchin.json ([0865de1](https://github.com/Caputchin/caputchin-sdk/commit/0865de15d6cb1630c810455cc696f2212c1f164e))
* **widget:** skin axis with built-in light/dark + typed asset validation + ctx.skin ([6518157](https://github.com/Caputchin/caputchin-sdk/commit/6518157607e33222d4fbe3444fa390688d57d33c))


### Reverts

* release-please PR [#10](https://github.com/Caputchin/caputchin-sdk/issues/10) due to broken title pattern config ([e0d7ef0](https://github.com/Caputchin/caputchin-sdk/commit/e0d7ef0ed6e781463588508226678a9d19528037))


### Code Refactoring

* **sdk:** rename bridge.complete to bridge.pass for success-only semantics ([fc384c5](https://github.com/Caputchin/caputchin-sdk/commit/fc384c586203d7dc47f34e3417ef814c601662ce))

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
