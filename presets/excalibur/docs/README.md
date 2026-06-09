# @caputchin/preset-excalibur

## Interfaces

| Interface | Description |
| ------ | ------ |
| [ActionEvent](Interface.ActionEvent.md) | A named-action edge at a tick (the action's index in the game's `actions`). |
| [ApiPointer](Interface.ApiPointer.md) | Live pointer state for the current tick. |
| [ApiPointerEvent](Interface.ApiPointerEvent.md) | A pointer event the sim sees this tick, in the game's fixed world space. |
| [Bridge](Interface.Bridge.md) | The control surface the widget hands your game factory (second argument). Use it to report a completed round, surface an error, or resize the frame. The widget owns the verification flow; the bridge is how your game talks back to it. |
| [ExcaliburGame](Interface.ExcaliburGame.md) | An Excalibur game ready to mount live or replay headless. Build with [defineExcaliburGame](Function.defineExcaliburGame.md). |
| [ExcaliburGameApi](Interface.ExcaliburGameApi.md) | The deterministic API a sim reads each fixed tick. The SAME object is handed to the game factory in the browser and in the headless replay, so sim code written against it reproduces identically both ends. |
| [ExcaliburGameOptions](Interface.ExcaliburGameOptions.md) | Options for [defineExcaliburGame](Function.defineExcaliburGame.md). |
| [GameContext](Interface.GameContext.md) | Per-session context the widget passes to the game factory as a third arg. |
| [MountArgs](Interface.MountArgs.md) | Args for [mountExcaliburGame](Function.mountExcaliburGame.md). Mirrors the SDK `register` callback parameters. |
| [PointerEvent](Interface.PointerEvent.md) | A pointer event at a tick, in world coordinates. |
| [PumpResult](Interface.PumpResult.md) | - |
| [Verdict](Interface.Verdict.md) | The output of a replay `run`, and the only thing we read from it. `passed` drives the captcha decision; `score` and `durationMs` are carried in the issued token (and a future scoreboard). The shape is OURS; everything else about the run - the engine, the trace, the renderer - is the customer's. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ExcaliburGameFactory](TypeAlias.ExcaliburGameFactory.md) | The author's game builder: set up the scene (sim always; render guarded by `api.headless`), then register `api.onTick` sim logic and (live) wire input. |
| [InputEvent](TypeAlias.InputEvent.md) | One input event the sim applies at a tick. |
| [PointerKind](TypeAlias.PointerKind.md) | Pointer phase: 0 = down, 1 = move, 2 = up. |
| [RecordedEvent](TypeAlias.RecordedEvent.md) | An input event stamped with the tick it landed on. |
| [RunFn](TypeAlias.RunFn.md) | The one mandatory contract. A replayable game ships a JS or WASM module exporting a function of this shape under the name [RUN\_EXPORT\_NAME](https://github.com/Caputchin/caputchin-sdk/tree/main/packages/replay-contract): |
| [Seed](TypeAlias.Seed.md) | The replay seed: the low 128 bits of `SHA-256(sessionId : gameId : roundIndex)`, carried as four unsigned 32-bit words, most-significant word first. |

## Variables

| Variable | Description |
| ------ | ------ |
| [CODEC\_V](Variable.CODEC_V.md) | Current wire version. Bump only on an incompatible envelope change. |
| [FIXED\_TIMESTEP\_MS](Variable.FIXED_TIMESTEP_MS.md) | Milliseconds of virtual time per logical sim tick (50 Hz). |
| [FIXED\_UPDATE\_FPS](Variable.FIXED_UPDATE_FPS.md) | Excalibur `fixedUpdateFps` matching [FIXED\_TIMESTEP\_MS](Variable.FIXED_TIMESTEP_MS.md). |

## Functions

| Function | Description |
| ------ | ------ |
| [decodeTrace](Function.decodeTrace.md) | Decode the wire trace. Throws on a malformed blob (the run adapter catches it and returns a failing verdict, never a crash). The empty string / empty envelope decodes to no events (a valid empty round). |
| [defineExcaliburGame](Function.defineExcaliburGame.md) | Declare an Excalibur game once; mount it live with [mountExcaliburGame](Function.mountExcaliburGame.md) and replay it headless with [excaliburRun](Function.excaliburRun.md). Both ends run the SAME factory over the SAME fixed-dt ticks, so the live result and the server verdict agree by construction. |
| [encodeTrace](Function.encodeTrace.md) | Encode recorded events to the compact wire string. Coordinates are rounded to integers (the world is integer-pixel, so this is lossless for a conforming game and keeps the trace small + the codec bit-identical). |
| [excaliburRun](Function.excaliburRun.md) | Build the conforming `run` from an [ExcaliburGame](Interface.ExcaliburGame.md). The game's run entry does: |
| [foldSeed](Function.foldSeed.md) | Fold a 128-bit platform [Seed](TypeAlias.Seed.md) into a single unsigned 32-bit integer, for APIs that take a numeric seed (e.g. `ex.Random`). The gameplay RNG should use the full-entropy `rng(seed)` from `@caputchin/determinism` instead; this is only for engine internals that demand a number. Never zero (some PRNGs degenerate on a zero seed), so a zero fold maps to 1. |
| [installExcaliburDom](Function.installExcaliburDom.md) | Install the Excalibur headless DOM stubs onto `scope` (default `globalThis`). HEADLESS ONLY. Idempotent enough to call once at module load and again at the start of each `run()` (the replay self-check prober shadows globals per call; re-installing re-asserts the deterministic stubs over the probe). |
| [installExcaliburHeadless](Function.installExcaliburHeadless.md) | The full headless boot env for the replay isolate: DOM stubs + deterministic `Math` transcendentals + frozen wall clock. Call once at module load (via `@caputchin/preset-excalibur/install`) AND at the start of every `run()` so the env survives the self-check prober - re-installing re-asserts the deterministic stubs (as plain VALUES, a define never a read) over the prober's per-call access-tracking getters, which is what keeps the engine's `performance.now` clock reads from registering as ambient access. (Sealing the ambient set non-configurable is deliberately NOT done: it is unnecessary here - verified by the replay self-check passing without it - and would turn `setTimeout` into a non-firing no-op that hangs a host test runner.) HEADLESS ONLY. |
| [mountExcaliburGame](Function.mountExcaliburGame.md) | Mount an [ExcaliburGame](Interface.ExcaliburGame.md) live in the iframe. Call from the SDK `register` callback: `register((container, bridge, ctx) => mountExcaliburGame(game, { container, bridge, ctx }))`. Returns a cleanup function. |
| [pumpHeadless](Function.pumpHeadless.md) | - |
