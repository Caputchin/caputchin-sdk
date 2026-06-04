# Interface: AmbientSurface

One non-deterministic global surface. `probe` marks membership in the
 prober's set (vs shim-only); see the module note for the WASM rationale.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="kind"></a> `kind` | `readonly` | [`AmbientKind`](TypeAlias.AmbientKind.md) | The determinism axis it violates if touched. |
| <a id="name"></a> `name` | `readonly` | `string` | The global name (e.g. `'Date'`, `'fetch'`). |
| <a id="probe"></a> `probe` | `readonly` | `boolean` | `true` if the prober bans it too; `false` for shim-only surfaces a conforming WASM run legitimately uses (`WebAssembly`/`Atomics`/ `SharedArrayBuffer`) or benign teardown pairs not worth probing. |
