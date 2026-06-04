# @caputchin/preset-kaplay

## Interfaces

| Interface | Description |
| ------ | ------ |
| [Bridge](Interface.Bridge.md) | The control surface the widget hands your game factory (second argument). Use it to report a completed round, surface an error, or resize the frame. The widget owns the verification flow; the bridge is how your game talks back to it. |
| [GameContext](Interface.GameContext.md) | Per-session context the widget passes to the game factory as a third arg. |
| [KaplayGame](Interface.KaplayGame.md) | A KAPLAY game ready to mount live or replay headless. Build with [defineKaplayGame](Function.defineKaplayGame.md). |
| [KaplayGameApi](Interface.KaplayGameApi.md) | The deterministic API a KAPLAY sim reads each fixed tick. The SAME object is handed to the scene factory in the browser and in the headless replay, so sim code written against it reproduces identically both ends. |
| [KaplayGameOptions](Interface.KaplayGameOptions.md) | Options for [defineKaplayGame](Function.defineKaplayGame.md): the action set, key bindings, the replay tick cap, and KAPLAY init options. |
| [KaplayShim](Interface.KaplayShim.md) | A handle to an installed shim: the canvas KAPLAY draws into, plus loop control. |
| [MountArgs](Interface.MountArgs.md) | Args for [mountKaplayGame](Function.mountKaplayGame.md). Mirrors the SDK `register` callback parameters. |
| [PumpResult](Interface.PumpResult.md) | - |
| [RecordedEvent](Interface.RecordedEvent.md) | One recorded action edge: a press/release of an action index at a logical tick. |
| [Verdict](Interface.Verdict.md) | The output of a replay `run`, and the only thing we read from it. `passed` drives the captcha decision; `score` and `durationMs` are carried in the issued token (and a future scoreboard). The shape is OURS; everything else about the run - the engine, the trace, the renderer - is the customer's. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [KaplaySceneFactory](TypeAlias.KaplaySceneFactory.md) | The author's scene builder: add objects, register `onFixedUpdate` sim logic, wire live input. |
| [RunFn](TypeAlias.RunFn.md) | The one mandatory contract. A replayable game ships a JS or WASM module exporting a function of this shape under the name [RUN\_EXPORT\_NAME](https://github.com/Caputchin/caputchin-sdk/tree/main/packages/replay-contract): |
| [Seed](TypeAlias.Seed.md) | The replay seed: the low 128 bits of `SHA-256(sessionId : gameId : roundIndex)`, carried as four unsigned 32-bit words, most-significant word first. |

## Variables

| Variable | Description |
| ------ | ------ |
| [FIXED\_TIMESTEP\_MS](Variable.FIXED_TIMESTEP_MS.md) | One logical sim tick / one pumped KAPLAY frame, in milliseconds. KAPLAY's default fixed update is 50 Hz, so this is 20 ms. The whole determinism model rests on driving KAPLAY exactly ONE fixed-dt frame per pump in BOTH the browser and the headless replay: each frame then runs one `update` (with `dt()` == this) and one `fixedUpdate`, with identical internal RNG draws and identical physics integration, so `k.rand()` and KAPLAY physics are deterministic across the two environments. The verdict's `durationMs` is `ticks * this`. |

## Functions

| Function | Description |
| ------ | ------ |
| [decodeTrace](Function.decodeTrace.md) | Decode a trace produced by [encodeTrace](Function.encodeTrace.md). Throws on a malformed or wrong-version blob; the caller ([kaplayRun](Function.kaplayRun.md)) turns a throw into a failing verdict so a garbage trace is a failed round, never a crash. Accepts a string or UTF-8 bytes. |
| [defineKaplayGame](Function.defineKaplayGame.md) | Package a KAPLAY scene factory + options into a [KaplayGame](Interface.KaplayGame.md) that can be mounted live ([mountKaplayGame](Function.mountKaplayGame.md)) or replayed headless ([kaplayRun](Function.kaplayRun.md)). |
| [encodeTrace](Function.encodeTrace.md) | Serialize recorded events into an opaque trace string. |
| [foldSeed](Function.foldSeed.md) | Fold the four-word platform [Seed](TypeAlias.Seed.md) into one positive integer below 2^31, which is what KAPLAY's `randSeed` accepts. Uses a fixed integer hash (`Math.imul`), so it is bit-identical on every runtime. |
| [installKaplayShim](Function.installKaplayShim.md) | Install the KAPLAY headless globals onto `scope` (default `globalThis`) and return a [KaplayShim](Interface.KaplayShim.md). `requestAnimationFrame` is CAPTURING: it stores the callback instead of scheduling it, so KAPLAY's loop only advances when [KaplayShim.flushFrame](Interface.KaplayShim.md#flushframe) is called. Also makes `Math` transcendentals deterministic (the kit's `makeDeterministic`) and freezes the wall clock (the kit's `freezeClock`) so the headless replay is bit-identical to live play and independent of when it runs. [KaplayShim.uninstall](Interface.KaplayShim.md#uninstall) fully restores all of it. Idempotent per scope is NOT guaranteed - install once, uninstall when done. |
| [kaplayRun](Function.kaplayRun.md) | Build the conforming `run` for a [KaplayGame](Interface.KaplayGame.md). The returned function decodes the trace, boots KAPLAY headless, replays the recorded inputs over the SAME scene the browser ran, and maps the outcome to a [Verdict](Interface.Verdict.md). It is async (KAPLAY's headless boot awaits its asset load); the replay host awaits it. |
| [mountKaplayGame](Function.mountKaplayGame.md) | Mount a [KaplayGame](Interface.KaplayGame.md) live in the iframe. Call from the SDK `register` callback: `register((container, bridge, ctx) => mountKaplayGame(game, { container, bridge, ctx }))`. Returns a cleanup function. |
| [pumpHeadless](Function.pumpHeadless.md) | - |
