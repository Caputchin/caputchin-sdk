# @caputchin/replay-contract

The **one mandatory surface** for Caputchin server-validated game replay: the
`run` function shape, the `Verdict` it returns, and the per-round `Seed` plus its
derivation. The platform, the widget, the engine kits, and the replay Worker all
agree on exactly this. Deliberately **tiny and dependency-free** - it is loaded
into a sealed replay isolate, so it pulls in nothing.

A replayable game ships a JS or WASM module exporting one function under the name
`RUN_EXPORT_NAME`:

```ts
import type { RunFn } from '@caputchin/replay-contract';

export const run: RunFn = (seed, config, trace) => {
  // re-run the recorded play deterministically...
  return { passed: true, score: 1234, durationMs: 8000 };
};
```

- `seed` - the server-derived per-round `Seed` (a 4-tuple of u32). Never
  client-supplied.
- `config` - the server-resolved gameplay config, or `null` for the run's own
  defaults. Opaque; gate-affecting fields belong here, never in the trace.
- `trace` - the opaque blob the client emitted and this function alone
  interprets (raw bytes or a string).
- returns a `Verdict` (`{ passed, score, durationMs }`), sync or async.

The function MUST be pure and deterministic ACROSS the player runtime and the
server isolate: identical `(seed, config, trace)` yields an identical verdict in
both. How (fixed-point, WASM-spec floats, or IEEE-754 plus a deterministic Math
shim) is the author's choice.

## Exports

- **Types**: `RunFn`, `Verdict`, `Seed`, `ReplayConfig`.
- **Seed**: `deriveSeed`, `SEED_WORDS`, `SEED_BYTES`.
- **Verdict**: `parseVerdict` (validate an untrusted return value).
- **Invocation constants**: `RUN_EXPORT_NAME` (the export the artifact provides),
  `RUN_RPC_METHOD` (the host entrypoint method for a replay), `RUN_SELFCHECK_RPC`
  (the host entrypoint method for a determinism self-check).

## Building on it

You can write a conforming `run` by hand against this package alone. For
on-ramps, see [`@caputchin/engine-kit`](../../kits/engine-kit) (the reducer
lane), [`@caputchin/replay-wasm`](../../kits/replay-wasm) (the WASM lane), and the
per-engine presets.
