# @caputchin/engine-kit

## Interfaces

| Interface | Description |
| ------ | ------ |
| [EngineDef](Interface.EngineDef.md) | The pure reducer the kit drives. `S` = engine state (must be plain-serializable), `A` = the author's action type, `C` = config shape. |
| [EngineSetup](Interface.EngineSetup.md) | Setup handed to `init`. `config` is the RAW, server-resolved gameplay config (the per-site dashboard config), opaque to the platform and possibly `null` (no config supplied). `init` is the SINGLE place that raw config is transformed into the engine's internal sim parameters - including resolving `null` to the engine's own defaults - so the live game and the headless replay, both calling `init` with the same raw config, cannot diverge. |
| [ReplayInput](Interface.ReplayInput.md) | Inputs to a single replay run. |
| [ReplayOutcome](Interface.ReplayOutcome.md) | Authoritative outcome of a replay run produced by [replay](Function.replay.md). |
| [Result](Interface.Result.md) | What the engine reports when the game ends. `score` is the value the verdict carries; `passed` is the engine's OWN pass/fail decision, read from the terminal state (e.g. a goal reached, or a threshold the resolved config set). Pass lives HERE, beside the state it judges, so the headless replay and the live game share one decision site - never an external gate that one path can compute differently. |
| [TickInput](Interface.TickInput.md) | One recorded input the replay loop applies: the author's `action`, stamped with the LOGICAL tick it lands on (never wall-clock). This is a structural helper for the kit's loop + codec, generic over the author's action type - it is not a "trace" the platform sees. |
| [ToRunOptions](Interface.ToRunOptions.md) | Options for [toRun](Function.toRun.md). |

## Variables

| Variable | Description |
| ------ | ------ |
| [CODEC\_V](Variable.CODEC_V.md) | Version of the kit's default trace codec envelope. Stamped into every trace this kit encodes; increment only on a structural change to the envelope. This is a kit-internal detail: the platform never inspects trace bytes, so `CODEC_V` is not a wire contract. |
| [FIXED\_TIMESTEP\_MS](Variable.FIXED_TIMESTEP_MS.md) | Fixed simulation timestep in milliseconds. Every engine tick advances the simulation by this amount; play duration is `endTick * FIXED_TIMESTEP_MS`. Integer on purpose so duration arithmetic stays pure-integer with no floating-point drift. 16 ms gives approximately 62.5 logical fps, close enough to 60 fps for a captcha minigame. |

## Functions

| Function | Description |
| ------ | ------ |
| [decodeTrace](Function.decodeTrace.md) | Parse a trace produced by [encodeTrace](Function.encodeTrace.md) back into recorded inputs. Throws on a malformed blob - `toRun` catches that and yields a failing verdict (a garbage trace is a failed round, never a crash). Accepts the trace as a string or UTF-8 bytes. |
| [defineEngine](Function.defineEngine.md) | Identity helper a game uses to declare its reducer, purely for type inference - `defineEngine` does not wrap or transform it. Pair it with `toRun` to produce the conforming `run(seed, trace)` the artifact exports; `defineEngine` is one OPTIONAL authoring lane, not the mandatory contract. |
| [encodeTrace](Function.encodeTrace.md) | Serialize recorded inputs into an opaque trace string. |
| [replay](Function.replay.md) | Re-run a recorded round under the fixed-step loop: start `engine` from its seeded initial state, apply each recorded action on the tick it was recorded for (preserving order within a tick), and return the [ReplayOutcome](Interface.ReplayOutcome.md). This is the same deterministic loop that drives live play, so a [toRun](Function.toRun.md)-wrapped engine reproduces the live result exactly under the issued seed (live score equals replay score by construction). |
| [toRun](Function.toRun.md) | Adapt a reducer into a `run` that conforms to the `RunFn` contract in `@caputchin/replay-contract`. The returned `run`: decodes the trace (a malformed/empty blob yields a failing verdict rather than throwing, so the index conformance smoke always gets a verdict), replays the reducer over `(seed, config, inputs)`, and maps the outcome to a verdict. |
