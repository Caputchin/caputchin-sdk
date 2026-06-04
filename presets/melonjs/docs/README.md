# @caputchin/preset-melonjs

## Interfaces

| Interface | Description |
| ------ | ------ |
| [DeterministicEnv](Interface.DeterministicEnv.md) | The seeded randomness + fixed clock a [withDeterministicEnv](Function.withDeterministicEnv.md) call installs for the duration of one trapped function. The caller supplies the seeded stream (e.g. this kit's own [rng](Function.rng.md)), so the trap itself stays PRNG-agnostic. |
| [EngineDef](Interface.EngineDef.md) | The pure reducer the kit drives. `S` = engine state (must be plain-serializable), `A` = the author's action type, `C` = config shape. |
| [MelonDriver](Interface.MelonDriver.md) | Create the per-round driver state shared by the headless engine and the live mount: builds the Application, seeds rng, and exposes the fixed-step advance. |
| [MelonGameApi](Interface.MelonGameApi.md) | Per-round context handed to every spec method. |
| [MelonGameSpec](Interface.MelonGameSpec.md) | A melonJS game using the full engine. The preset builds the Application and drives `world.update`; the author owns the scene + reads the verdict. |
| [Result](Interface.Result.md) | What the engine reports when the game ends. `score` is the value the verdict carries; `passed` is the engine's OWN pass/fail decision, read from the terminal state (e.g. a goal reached, or a threshold the resolved config set). Pass lives HERE, beside the state it judges, so the headless replay and the live game share one decision site - never an external gate that one path can compute differently. |
| [Rng](Interface.Rng.md) | Deterministic PRNG seeded from a 128-bit seed (four u32 words). Built on sfc32 (Small Fast Counter, 128-bit state) using only 32-bit integer operations, so the stream is bit-identical across every JS engine and V8 version. |
| [TickInput](Interface.TickInput.md) | One recorded input the replay loop applies: the author's `action`, stamped with the LOGICAL tick it lands on (never wall-clock). This is a structural helper for the kit's loop + codec, generic over the author's action type - it is not a "trace" the platform sees. |
| [Verdict](Interface.Verdict.md) | The output of a replay `run`, and the only thing we read from it. `passed` drives the captcha decision; `score` and `durationMs` are carried in the issued token (and a future scoreboard). The shape is OURS; everything else about the run - the engine, the trace, the renderer - is the customer's. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [MelonApplication](TypeAlias.MelonApplication.md) | A booted melonJS Application instance (carries `.world`, the camera, the renderer). |
| [MelonNamespace](TypeAlias.MelonNamespace.md) | The melonJS module namespace (`import * as me from 'melonjs'`). |
| [RngState](TypeAlias.RngState.md) | Serializable PRNG state: four unsigned 32-bit words. Pass to [rngFromState](Function.rngFromState.md) to resume an exact stream. |
| [RunFn](TypeAlias.RunFn.md) | The one mandatory contract. A replayable game ships a JS or WASM module exporting a function of this shape under the name RUN\_EXPORT\_NAME: |
| [Seed](TypeAlias.Seed.md) | The replay seed: the low 128 bits of `SHA-256(sessionId : gameId : roundIndex)`, carried as four unsigned 32-bit words, most-significant word first. |

## Variables

| Variable | Description |
| ------ | ------ |
| [capMath](Variable.capMath.md) | The deterministic math surface. Import and call `cap.math.sin(...)` in engine code instead of `Math.sin(...)`. The shim also swaps `Math.*` transcendentals to point here as a runtime safety net. |
| [FIXED\_TIMESTEP\_MS](Variable.FIXED_TIMESTEP_MS.md) | Fixed simulation timestep in milliseconds. Every engine tick advances the simulation by this amount; play duration is `endTick * FIXED_TIMESTEP_MS`. Integer on purpose so duration arithmetic stays pure-integer with no floating-point drift. 16 ms gives approximately 62.5 logical fps, close enough to 60 fps for a captcha minigame. |

## Functions

| Function | Description |
| ------ | ------ |
| [applyHeadlessDom](Function.applyHeadlessDom.md) | Install the headless DOM stubs onto `scope` (default `globalThis`) so a browser-targeted game engine boots with no real DOM. Idempotent; call once before the engine evaluates on the server. Returns the names it installed (for diagnostics / tests). |
| [createMelonDriver](Function.createMelonDriver.md) | - |
| [decodeTrace](Function.decodeTrace.md) | Parse a trace produced by [encodeTrace](Function.encodeTrace.md) back into recorded inputs. Throws on a malformed blob - `toRun` catches that and yields a failing verdict (a garbage trace is a failed round, never a crash). Accepts the trace as a string or UTF-8 bytes. |
| [defineEngine](Function.defineEngine.md) | Identity helper a game uses to declare its reducer, purely for type inference - `defineEngine` does not wrap or transform it. Pair it with `toRun` to produce the conforming `run(seed, trace)` the artifact exports; `defineEngine` is one OPTIONAL authoring lane, not the mandatory contract. |
| [defineMelonGame](Function.defineMelonGame.md) | Adapt a [MelonGameSpec](Interface.MelonGameSpec.md) into an engine-kit [EngineDef](Interface.EngineDef.md) for the HEADLESS replay path. Pair with `toRun`: |
| [encodeTrace](Function.encodeTrace.md) | Serialize recorded inputs into an opaque trace string. |
| [freezeClock](Function.freezeClock.md) | Freeze the wall clock on `scope` to a fixed value so the headless replay reads no real time: `Date.now()` and (if present) `performance.now()` return `nowMs`, and `new Date()` yields a frozen instance. HEADLESS ONLY: live play must keep the real clock for rendering/audio, so it never calls this. |
| [rng](Function.rng.md) | Build a fresh PRNG from a 128-bit engine seed. The stream is mixed with a fixed warm-up so low-entropy seeds (e.g. mostly-zero words) decorrelate before first use; the warmed state is what `state` returns, so a later `rngFromState` resumes exactly. |
| [rngFromState](Function.rngFromState.md) | Resume a PRNG from previously captured state - no warm-up, exact stream. |
| [toRun](Function.toRun.md) | Adapt a reducer into a `run` that conforms to the `RunFn` contract in `@caputchin/replay-contract`. The returned `run`: decodes the trace (a malformed/empty blob yields a failing verdict rather than throwing, so the index conformance smoke always gets a verdict), replays the reducer over `(seed, config, inputs)`, and maps the outcome to a verdict. |
| [withDeterministicEnv](Function.withDeterministicEnv.md) | Run `fn` with the full deterministic environment installed, then RESTORE the originals afterward (even if `fn` throws). For the duration of `fn`: the transcendental `Math.*` are swapped to [capMath](Variable.capMath.md), `Math.random` is the seeded `env.random`, and `Date.now` / `performance.now` return `env.nowMs`. |
