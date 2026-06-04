# @caputchin/replay-contract

## Interfaces

| Interface | Description |
| ------ | ------ |
| [Verdict](Interface.Verdict.md) | The output of a replay `run`, and the only thing we read from it. `passed` drives the captcha decision; `score` and `durationMs` are carried in the issued token (and a future scoreboard). The shape is OURS; everything else about the run - the engine, the trace, the renderer - is the customer's. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ReplayConfig](TypeAlias.ReplayConfig.md) | The server-supplied gameplay config a run executes under. OPAQUE to the platform - each game defines its own shape, so we never type or inspect it, exactly like the trace - and NULLABLE: `null` means "use the run's own internal defaults", mirroring the bootstrap config-override's "empty ⇒ game defaults" semantics. |
| [RunFn](TypeAlias.RunFn.md) | The one mandatory contract. A replayable game ships a JS or WASM module exporting a function of this shape under the name [RUN\_EXPORT\_NAME](Variable.RUN_EXPORT_NAME.md): |
| [Seed](TypeAlias.Seed.md) | The replay seed: the low 128 bits of `SHA-256(sessionId : gameId : roundIndex)`, carried as four unsigned 32-bit words, most-significant word first. |

## Variables

| Variable | Description |
| ------ | ------ |
| [RUN\_EXPORT\_NAME](Variable.RUN_EXPORT_NAME.md) | The named export the artifact module MUST provide. The replay host looks up exactly this name on the loaded module. |
| [RUN\_RPC\_METHOD](Variable.RUN_RPC_METHOD.md) | The RPC method name the host `WorkerEntrypoint` exposes for invoking the loaded `run`. `apps/replay` calls `stub[RUN_RPC_METHOD](seed, config, trace)`; the load-time wrapper defines a method of this name that forwards to the module's [RUN\_EXPORT\_NAME](Variable.RUN_EXPORT_NAME.md) export. Sharing the constant keeps the host wrapper and the caller in lockstep. |
| [RUN\_SELFCHECK\_RPC](Variable.RUN_SELFCHECK_RPC.md) | The RPC method name the host `WorkerEntrypoint` exposes for the determinism SELF-CHECK over the loaded `run`. `apps/replay` calls `stub[RUN_SELFCHECK_RPC]()`; the load-time wrapper defines a method of this name that probes the module's [RUN\_EXPORT\_NAME](Variable.RUN_EXPORT_NAME.md) export (replaying it under a hostile environment) and returns a self-check report. Used at vendor / upload / index time to gate non-deterministic artifacts; separate from [RUN\_RPC\_METHOD](Variable.RUN_RPC_METHOD.md) (the authoritative per-verify replay). Sharing the constant keeps the host wrapper and the caller in lockstep. |
| [SEED\_BYTES](Variable.SEED_BYTES.md) | Byte length of a [Seed](TypeAlias.Seed.md) (128 bits). |
| [SEED\_WORDS](Variable.SEED_WORDS.md) | Number of 32-bit words in a [Seed](TypeAlias.Seed.md) (128 bits / 32). |

## Functions

| Function | Description |
| ------ | ------ |
| [deriveSeed](Function.deriveSeed.md) | Derive the per-round seed from the session, game, and round index. |
| [parseVerdict](Function.parseVerdict.md) | Validate an untrusted value as a [Verdict](Interface.Verdict.md). The `run` is customer code, so its return value is untrusted: the replay host MUST funnel it through here and treat a `null` result as a REJECTED round, never a passing one. Returns a fresh, normalized Verdict (exactly the three fields) on success, or `null` on any shape violation. |
