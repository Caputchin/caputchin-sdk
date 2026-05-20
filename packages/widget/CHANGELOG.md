# Changelog

## 2.0.0 (2026-05-20)


### ⚠ BREAKING CHANGES

* **widget:** depends on `@caputchin/game-sdk` 2.x. Iframe runtime now reads `Caputchin.manifests[id]` instead of `Caputchin.gameOpts[id]`, and `kickoff` postMessages carry a `lang` field.
* **widget:** `ManifestMessage` (iframe → widget postMessage) gains a `languages: { presets } | null` field; existing `preferredLayout` / `preferredWidth` / `preferredHeight` now sourced from the game's manifest top-level instead of `RegisterOptions`.


### Features

* **widget:** add `lang` attribute on `<caputchin-game>` accepting preset name, ISO 639 code, `auto`, or inline JSON; resolution runs after manifest postMessage and fires `invalid-config` for unknowns.
* **widget:** ship internal `caputchin.json` with en + ar chrome presets; widget chrome resolves browser-auto and applies `dir="rtl"` for RTL languages.

## 1.0.0 (2026-05-13)


### ⚠ BREAKING CHANGES

* **sdk:** rename bridge.complete to bridge.pass for success-only semantics

### Features

* **ci:** add CI workflow with codecov coverage upload ([727ad0d](https://github.com/Caputchin/caputchin-sdk/commit/727ad0dd8c7f1d98d4945269a906636b2c76da52))
* **frontend:** scaffold @caputchin/widget and @caputchin/game-sdk skeleton packages ([ef9d444](https://github.com/Caputchin/caputchin-sdk/commit/ef9d44434bd76a4168df6cb4f9ac99b8666bc579))
* **widget:** add game-only mode (skips Cap, hosts game iframe only) ([57abb99](https://github.com/Caputchin/caputchin-sdk/commit/57abb992c7f0b6f8005dda81b01408dd93ddf253))
* **widget:** expose author bridge.error code via error.detail.originalCode ([f42bf0c](https://github.com/Caputchin/caputchin-sdk/commit/f42bf0cf13d3f503824aae82984641356768ec92))
* **widget:** implement Cap client, element, modes — full verification pipeline ([d225646](https://github.com/Caputchin/caputchin-sdk/commit/d2256461a05eda2755003a2ac40e0aef8120b9ed))
* **widget:** implement iframe layer — srcdoc builder, runtime bootstrap, IframeHost ([502f8ec](https://github.com/Caputchin/caputchin-sdk/commit/502f8ecc4fea2c64dffd32f00d285599b727a0b8))
* **widget:** implement pure modules — config, errors, types, pool, token, resolver, protocol ([2abe118](https://github.com/Caputchin/caputchin-sdk/commit/2abe118f9c4b3128df40927365dac0c75f17f739))
* **widget:** scaffold package — Cap dep, vitest, two-pass tsup build, env vars ([aee9f49](https://github.com/Caputchin/caputchin-sdk/commit/aee9f49b74a2727c3493b258bf60814c126ba712))


### Bug Fixes

* **ci:** align coverage thresholds; add permissions+concurrency to ci.yml; fix codecov target ([f648c2c](https://github.com/Caputchin/caputchin-sdk/commit/f648c2ccf9bc4ce8555cdfc82265ba8c3c401f5e))
* **widget:** address M1-M6 phase-1 minor findings ([86077fb](https://github.com/Caputchin/caputchin-sdk/commit/86077fb557a0ca0bcf6155dbb711f87a3a14758f))
* **widget:** address QA cycle-1 findings F1-F9 ([9f08de8](https://github.com/Caputchin/caputchin-sdk/commit/9f08de8d8b26c57952cfb7468ea09a79bbf9da5b))
* **widget:** align game-sdk bridge contract — shared types, error/complete shape, code forwarding ([eb532d8](https://github.com/Caputchin/caputchin-sdk/commit/eb532d8707cb5067bf75de678be138ca883cb09a))
* **widget:** raise branches threshold to 80 (M7 monotonic floor) ([6d585ad](https://github.com/Caputchin/caputchin-sdk/commit/6d585add7dec86686e57c794f30b157e05450b46))
* **widget:** rename ESM to .mjs and IIFE to widget.js for CDN script-tag compatibility ([1240c7d](https://github.com/Caputchin/caputchin-sdk/commit/1240c7d4cd913e727db7b3f61cec283ef25a9c52))
* **widget:** resolve @caputchin/game-sdk via tsconfig paths so typecheck works without dist ([7066206](https://github.com/Caputchin/caputchin-sdk/commit/7066206123c183db107728b893881f5bdcd90282))


### Code Refactoring

* **sdk:** rename bridge.complete to bridge.pass for success-only semantics ([fc384c5](https://github.com/Caputchin/caputchin-sdk/commit/fc384c586203d7dc47f34e3417ef814c601662ce))
