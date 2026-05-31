# index

## Interfaces

| Interface | Description |
| ------ | ------ |
| [CaseReport](index.Interface.CaseReport.md) | - |
| [EngineDef](index.Interface.EngineDef.md) | The pure reducer the kit drives. `S` = engine state (must be plain-serializable), `A` = the author's action type, `C` = config shape. |
| [EngineSetup](index.Interface.EngineSetup.md) | Setup handed to `init`. `config` is the RAW, server-resolved gameplay config (the per-site dashboard config), opaque to the platform and possibly `null` (no config supplied). `init` is the SINGLE place that raw config is transformed into the engine's internal sim parameters - including resolving `null` to the engine's own defaults - so the live game and the headless replay, both calling `init` with the same raw config, cannot diverge. |
| [ReplayInput](index.Interface.ReplayInput.md) | Inputs to a single replay run. |
| [ReplayOutcome](index.Interface.ReplayOutcome.md) | Authoritative outcome of a replay run. |
| [Result](index.Interface.Result.md) | What the engine reports when the game ends. `score` is the value the verdict carries; `passed` is the engine's OWN pass/fail decision, read from the terminal state (e.g. a goal reached, or a threshold the resolved config set). Pass lives HERE, beside the state it judges, so the headless replay and the live game share one decision site - never an external gate that one path can compute differently. |
| [Rng](index.Interface.Rng.md) | - |
| [SelfCheckCase](index.Interface.SelfCheckCase.md) | One determinism probe: a seed + the opaque trace recorded under it, optionally under a specific server config (defaults to `null` → the run's own defaults). Generic over the run's config shape so a typed `RunFn<C>` self-checks without a cast; defaults to the opaque ReplayConfig. |
| [SelfCheckOptions](index.Interface.SelfCheckOptions.md) | - |
| [SelfCheckReport](index.Interface.SelfCheckReport.md) | - |
| [TickInput](index.Interface.TickInput.md) | One recorded input the replay loop applies: the author's `action`, stamped with the LOGICAL tick it lands on (never wall-clock). This is a structural helper for the kit's loop + codec, generic over the author's action type - it is not a "trace" the platform sees. |
| [ToRunOptions](index.Interface.ToRunOptions.md) | - |
| [Verdict](index.Interface.Verdict.md) | The output of a replay `run`, and the only thing we read from it. `passed` drives the captcha decision; `score` and `durationMs` are carried in the issued token (and a future scoreboard). The shape is OURS; everything else about the run - the engine, the trace, the renderer - is the customer's. |
| [Violation](index.Interface.Violation.md) | - |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [RngState](index.TypeAlias.RngState.md) | Serializable PRNG state: four unsigned 32-bit words. |
| [RunFn](index.TypeAlias.RunFn.md) | The one mandatory contract. A replayable game ships a JS or WASM module exporting a function of this shape under the name [RUN\_EXPORT\_NAME](index.Variable.RUN_EXPORT_NAME.md): |
| [Seed](index.TypeAlias.Seed.md) | The replay seed: the low 128 bits of `SHA-256(sessionId : gameId : roundIndex)`, carried as four unsigned 32-bit words, most-significant word first. |
| [ViolationKind](index.TypeAlias.ViolationKind.md) | Which determinism invariant a case violated. The `detail` always names the exact surface or symptom. |

## Variables

| Variable | Description |
| ------ | ------ |
| [cap](index.Variable.cap.md) | The author-facing toolkit, grouped for ergonomics: `cap.rng(seed)` for randomness, `cap.math.sin(...)` for deterministic transcendentals. (Both are also exported individually above.) |
| [capMath](index.Variable.capMath.md) | The deterministic math surface. Import and call `cap.math.sin(...)` in engine code instead of `Math.sin(...)`. The shim also swaps `Math.*` transcendentals to point here as a runtime safety net. |
| [CODEC\_V](index.Variable.CODEC_V.md) | - |
| [FIXED\_TIMESTEP\_MS](index.Variable.FIXED_TIMESTEP_MS.md) | - |
| [RUN\_EXPORT\_NAME](index.Variable.RUN_EXPORT_NAME.md) | The named export the artifact module MUST provide. The replay host looks up exactly this name on the loaded module. |
| [RUN\_RPC\_METHOD](index.Variable.RUN_RPC_METHOD.md) | The RPC method name the host `WorkerEntrypoint` exposes for invoking the loaded `run`. `apps/replay` calls `stub[RUN_RPC_METHOD](seed, config, trace)`; the load-time wrapper defines a method of this name that forwards to the module's [RUN\_EXPORT\_NAME](index.Variable.RUN_EXPORT_NAME.md) export. Sharing the constant keeps the host wrapper and the caller in lockstep. |
| [SHIM\_VERSION](index.Variable.SHIM_VERSION.md) | - |

## Functions

| Function | Description |
| ------ | ------ |
| [applyDomShim](index.Function.applyDomShim.md) | Install the headless DOM stubs onto the given scope (default `globalThis`). Idempotent; call once before instantiating a framework-headless sim. Returns the names it installed (for diagnostics/tests). Frameworks reach for these as bare globals, so `document` / `navigator` / `requestAnimationFrame` are hoisted onto the scope alongside `window`. |
| [decodeTrace](index.Function.decodeTrace.md) | Parse a trace produced by [encodeTrace](index.Function.encodeTrace.md) back into recorded inputs. Throws on a malformed blob - `toRun` catches that and yields a failing verdict (a garbage trace is a failed round, never a crash). Accepts the trace as a string or UTF-8 bytes. |
| [defineEngine](index.Function.defineEngine.md) | Identity helper a game uses to declare its reducer, purely for type inference - `defineEngine` does not wrap or transform it. Pair it with `toRun` to produce the conforming `run(seed, trace)` the artifact exports; `defineEngine` is one OPTIONAL authoring lane, not the mandatory contract. |
| [deriveSeed](index.Function.deriveSeed.md) | Derive the per-round seed from the session, game, and round index. |
| [encodeTrace](index.Function.encodeTrace.md) | Serialize recorded inputs into an opaque trace string. |
| [parseVerdict](index.Function.parseVerdict.md) | Validate an untrusted value as a [Verdict](index.Interface.Verdict.md). The `run` is customer code, so its return value is untrusted: the replay host MUST funnel it through here and treat a `null` result as a REJECTED round, never a passing one. Returns a fresh, normalized Verdict (exactly the three fields) on success, or `null` on any shape violation. |
| [project](index.Function.project.md) | What the live driver sends to the factory's `onState` each tick: the engine's `view(state)` projection when it defines one, otherwise the full state. This is a LIVE-render concern only - replay (`harness.replay`) never calls it, so `view` cannot influence the authoritative verdict. Centralized here so the "view-or-full-state" rule lives in one place the driver imports. |
| [replay](index.Function.replay.md) | - |
| [rng](index.Function.rng.md) | Build a fresh PRNG from a 128-bit engine seed. The stream is mixed with a fixed warm-up so low-entropy seeds (e.g. mostly-zero words) decorrelate before first use; the warmed state is what `state` returns, so a later `rngFromState` resumes exactly. |
| [rngFromState](index.Function.rngFromState.md) | Resume a PRNG from previously captured state - no warm-up, exact stream. |
| [selfCheck](index.Function.selfCheck.md) | Probe a `run` for determinism over the given cases. For each case the run is replayed many times under a hostile, isolate-equivalent environment; the report flags any case whose verdict is unstable across re-runs or depends on ambient non-determinism (wall-clock, `Math.random`/`crypto`, native trig, or other banned IO surfaces). `ok` is true only when every case is deterministic. |
| [toRun](index.Function.toRun.md) | Adapt a reducer into a `run` that conforms to the `RunFn` contract in `@caputchin/replay-contract`. The returned `run`: decodes the trace (a malformed/empty blob yields a failing verdict rather than throwing, so the index conformance smoke always gets a verdict), replays the reducer over `(seed, config, inputs)`, and maps the outcome to a verdict. |

## References

### applyShim {#applyshim}

Re-exports [applyShim](shim.Function.applyShim.md)
