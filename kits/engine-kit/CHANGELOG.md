# Changelog

## [0.4.0](https://github.com/Caputchin/caputchin-sdk/compare/engine-kit-v0.3.0...engine-kit-v0.4.0) (2026-06-04)


### Features

* **engine-kit:** reducer-to-run authoring lane, renamed from engine-runtime and trimmed of moved primitives ([2239f91](https://github.com/Caputchin/caputchin-sdk/commit/2239f9182fd20b6a71563a272464981fe2a7d972))

## [0.3.0](https://github.com/Caputchin/caputchin-sdk/compare/engine-runtime-v0.2.0...engine-runtime-v0.3.0) (2026-06-02)


### Features

* **sdk:** engine-preset homes (replay-rs crate, replay-wasm kit, bevy template, kits/presets split) ([e85fe73](https://github.com/Caputchin/caputchin-sdk/commit/e85fe73dfa41032c3dc8807d7e0c3b2b0e4e71ad))

## [0.2.0](https://github.com/Caputchin/caputchin-sdk/compare/engine-runtime-v0.1.0...engine-runtime-v0.2.0) (2026-06-01)


### ⚠ BREAKING CHANGES

* **engine-runtime:** fold config transform + pass decision into the engine
* **sdk:** server-supplied config in the replay run contract (seed, config, trace)

### Features

* **engine-runtime:** add deterministic execution + engine contract package ([a43dd3c](https://github.com/Caputchin/caputchin-sdk/commit/a43dd3c62a09f6ce5bedebd09cc4d2047f523fcc))
* **engine-runtime:** add optional view projection to engine contract ([c02ad5e](https://github.com/Caputchin/caputchin-sdk/commit/c02ad5e6d9b6095bf3d9153372ec1a1c76a84b63))
* **engine-runtime:** fold config transform + pass decision into the engine ([616b4f9](https://github.com/Caputchin/caputchin-sdk/commit/616b4f9616787869ab800ce272fa9cb05bbaa7bf))
* **engine-runtime:** reposition as optional kit (toRun, trace codec, dom-shim) ([57dfa9d](https://github.com/Caputchin/caputchin-sdk/commit/57dfa9d2ceef1fa1d38734770e8028c2175dec31))
* **sdk:** add caputchin-selfcheck pre-publish determinism tool (ADR-0069) ([843103f](https://github.com/Caputchin/caputchin-sdk/commit/843103fa1f49dbc6c27e0111b08956e6e279bfd6))
* **sdk:** server-supplied config in the replay run contract (seed, config, trace) ([ffd63b4](https://github.com/Caputchin/caputchin-sdk/commit/ffd63b47f995411745ff097acbd5c24ee46c9652))
