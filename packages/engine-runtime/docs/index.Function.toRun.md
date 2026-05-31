# Function: toRun()

> **toRun**\<`S`, `A`, `C`, `V`\>(`engine`, `opts`): (`seed`, `config`, `trace`) => [`Verdict`](index.Interface.Verdict.md)

Adapt a reducer into a `run` that conforms to the `RunFn` contract in
`@caputchin/replay-contract`. The returned `run`: decodes the trace (a
malformed/empty blob yields a failing verdict rather than throwing, so the
index conformance smoke always gets a verdict), replays the reducer over
`(seed, config, inputs)`, and maps the outcome to a verdict.

The config (server-resolved, possibly `null`) is passed STRAIGHT to
`engine.init`; the engine owns the config->sim transform AND its own
`null`->defaults resolution, so the same `engine.init` runs for both live play
and replay (no external transform that can drift). The pass decision is the
engine's (`outcome.passed` via `engine.result`); `toRun` only ANDs in the
truncated guard - a non-terminating run always fails. The result is
synchronous (the replay loop is), which still satisfies the sync-or-async
`RunFn` contract.

## Type Parameters

| Type Parameter |
| ------ |
| `S` |
| `A` |
| `C` |
| `V` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`EngineDef`](index.Interface.EngineDef.md)\<`S`, `A`, `C`, `V`\> |
| `opts` | [`ToRunOptions`](index.Interface.ToRunOptions.md)\<`A`\> |

## Returns

(`seed`, `config`, `trace`) => [`Verdict`](index.Interface.Verdict.md)
