# Type Alias: RunFn\<C\>

> **RunFn**\<`C`\> = (`seed`, `config`, `trace`) => [`Verdict`](index.Interface.Verdict.md) \| `Promise`\<[`Verdict`](index.Interface.Verdict.md)\>

The one mandatory contract. A replayable game ships a JS or WASM module
exporting a function of this shape under the name [RUN\_EXPORT\_NAME](index.Variable.RUN_EXPORT_NAME.md):

```
run(seed, config, trace) -> { passed, score, durationMs }
```

- `seed` is the server-derived per-round [Seed](index.TypeAlias.Seed.md) (server round-setup).
- `config` is the server-supplied ReplayConfig (server round-setup,
  nullable, opaque). seed + config are the round's server-owned setup; the
  trace is the player's input - hence the ordering.
- `trace` is the OPAQUE blob the customer's client emitted and this function
  alone interprets. We never parse or type its contents - it is raw bytes or a
  string, bounded only by a byte cap and the sandbox `cpuMs` limit. There is
  deliberately no `Trace` type anywhere: the engine owns its own input stream.
- the return is a [Verdict](index.Interface.Verdict.md), sync or async (WASM instantiation is async
  on first call, so the replay host always awaits it).

The function MUST be pure and deterministic ACROSS the player runtime and our
server isolate: identical `(seed, config, trace)` MUST yield an identical
verdict in both. How (fixed-point, WASM-spec floats, or IEEE-754 + the optional
shim) is the author's choice; we only host the replay.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `C` | `ReplayConfig` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `seed` | [`Seed`](index.TypeAlias.Seed.md) |
| `config` | `C` \| `null` |
| `trace` | `Uint8Array` \| `string` |

## Returns

[`Verdict`](index.Interface.Verdict.md) \| `Promise`\<[`Verdict`](index.Interface.Verdict.md)\>
