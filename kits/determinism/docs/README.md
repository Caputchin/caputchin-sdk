# @caputchin/determinism

## Interfaces

| Interface | Description |
| ------ | ------ |
| [AmbientSurface](Interface.AmbientSurface.md) | One non-deterministic global surface. `probe` marks membership in the prober's set (vs shim-only); see the module note for the WASM rationale. |
| [DeterministicEnv](Interface.DeterministicEnv.md) | The seeded randomness + fixed clock a [withDeterministicEnv](Function.withDeterministicEnv.md) call installs for the duration of one trapped function. The caller supplies the seeded stream (e.g. this kit's own [rng](Function.rng.md)), so the trap itself stays PRNG-agnostic. |
| [MathRandomTrap](Interface.MathRandomTrap.md) | A seed-then-restore trap for `Math.random`, scoped to a stepped callback. Apply it IDENTICALLY on both ends so any `Math.random` read inside the stepped sim consumes the SAME seeded stream live and on the server. |
| [Rng](Interface.Rng.md) | Deterministic PRNG seeded from a 128-bit seed (four u32 words). Built on sfc32 (Small Fast Counter, 128-bit state) using only 32-bit integer operations, so the stream is bit-identical across every JS engine and V8 version. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [AmbientKind](TypeAlias.AmbientKind.md) | Which determinism axis a surface violates, for the prober's report. The transcendental-trig axis is handled by the Math swap, not this registry. |
| [RngState](TypeAlias.RngState.md) | Serializable PRNG state: four unsigned 32-bit words. Pass to [rngFromState](Function.rngFromState.md) to resume an exact stream. |

## Variables

| Variable | Description |
| ------ | ------ |
| [abs](Variable.abs.md) | - |
| [AMBIENT\_SURFACES](Variable.AMBIENT_SURFACES.md) | - |
| [BAN\_ALL\_SURFACES](Variable.BAN_ALL_SURFACES.md) | Every surface name - the shim's ban set. |
| [capMath](Variable.capMath.md) | The deterministic math surface. Import and call `cap.math.sin(...)` in engine code instead of `Math.sin(...)`. The shim also swaps `Math.*` transcendentals to point here as a runtime safety net. |
| [ceil](Variable.ceil.md) | - |
| [E](Variable.E.md) | - |
| [ENV\_VERSION](Variable.ENV_VERSION.md) | Version of the deterministic execution environment this kit defines: `capMath`, the seeded `rng`, the `Math` swap, and the ambient-surface ban all ship together as one atomic environment, so any behavioral change to any of them produces a new `ENV_VERSION`. A recorded run's trace can stamp this value to bind itself to the environment that produced it. Sourced from `package.json` so it cannot drift from the published package version. |
| [floor](Variable.floor.md) | - |
| [HALF\_PI](Variable.HALF_PI.md) | - |
| [max](Variable.max.md) | - |
| [min](Variable.min.md) | - |
| [PI](Variable.PI.md) | - |
| [PROBE\_SURFACES](Variable.PROBE_SURFACES.md) | The prober's subset (name + axis), excluding WASM-legitimate surfaces. |
| [round](Variable.round.md) | - |
| [sign](Variable.sign.md) | - |
| [sqrt](Variable.sqrt.md) | - |
| [SWAPPED\_MATH\_KEYS](Variable.SWAPPED_MATH_KEYS.md) | The `Math` members that are NOT bit-identical across JS engines / CPU archs and must be swapped to the deterministic [capMath](Variable.capMath.md) kernels. The IEEE-754-mandated members (`sqrt` / `abs` / `floor` / `round` / `min` / `max` / ...) are already deterministic and are deliberately absent. |
| [TAU](Variable.TAU.md) | - |
| [trunc](Variable.trunc.md) | - |

## Functions

| Function | Description |
| ------ | ------ |
| [acos](Function.acos.md) | - |
| [applyHeadlessDom](Function.applyHeadlessDom.md) | Install the headless DOM stubs onto `scope` (default `globalThis`) so a browser-targeted game engine boots with no real DOM. Idempotent; call once before the engine evaluates on the server. Returns the names it installed (for diagnostics / tests). |
| [applyShim](Function.applyShim.md) | Apply the deterministic environment to the current global scope. Idempotent; call once before importing/running the engine. Returns the list of names it neutralized (for diagnostics/tests). |
| [asin](Function.asin.md) | - |
| [atan](Function.atan.md) | - |
| [atan2](Function.atan2.md) | - |
| [bannedProxy](Function.bannedProxy.md) | Build the value that replaces a banned global: a Proxy (over a function target) so it fails LOUD on every use shape - calling it (`fetch()`), constructing it (`new Date()`), AND reading any property (`crypto.getRandomValues`, `Intl.DateTimeFormat`, `navigator.language`) - the last is why a plain throwing function is not enough for namespace globals, where method access would otherwise be a cryptic `undefined is not a function`. `typeof` still reports `'function'` so benign feature-detection doesn't trip; symbol reads return `undefined` so host coercion machinery is left alone. |
| [cbrt](Function.cbrt.md) | - |
| [cos](Function.cos.md) | - |
| [cosh](Function.cosh.md) | - |
| [createMathRandomTrap](Function.createMathRandomTrap.md) | - |
| [exp](Function.exp.md) | - |
| [expm1](Function.expm1.md) | - |
| [freezeClock](Function.freezeClock.md) | Freeze the wall clock on `scope` to a fixed value so the headless replay reads no real time: `Date.now()` and (if present) `performance.now()` return `nowMs`, and `new Date()` yields a frozen instance. HEADLESS ONLY: live play must keep the real clock for rendering/audio, so it never calls this. |
| [hypot](Function.hypot.md) | - |
| [log](Function.log.md) | - |
| [log10](Function.log10.md) | - |
| [log1p](Function.log1p.md) | - |
| [log2](Function.log2.md) | - |
| [makeDeterministic](Function.makeDeterministic.md) | Prepare `scope` to run deterministically. Currently this is [swapMath](Function.swapMath.md); it is the single composition point future deterministic stubs (clock, RNG) will be added to, so callers get the full environment from one call. Returns the names of the globals it touched. |
| [mulberry32](Function.mulberry32.md) | mulberry32: a tiny PRNG with 32-bit state. Pure integer ops (`Math.imul`, shifts, xor) plus one float divide, so its stream is bit-identical across V8 builds (browser == server) and untouched by the deterministic-Math swap. Shared by [seedRandom](Function.seedRandom.md) and [createMathRandomTrap](Function.createMathRandomTrap.md). |
| [pow](Function.pow.md) | x^y. Built as exp(y*log(x)) with sign/integer-exponent handling. |
| [resolveMathScope](Function.resolveMathScope.md) | Resolve the `Math` object a scope sees: its own `Math` if it has one, else the ambient `Math`. The one audited resolution every Math-touching helper here shares, so the swap and any later ban/seed all target the SAME object and the rule can't drift between call sites. |
| [rng](Function.rng.md) | Build a fresh PRNG from a 128-bit engine seed. The stream is mixed with a fixed warm-up so low-entropy seeds (e.g. mostly-zero words) decorrelate before first use; the warmed state is what `state` returns, so a later `rngFromState` resumes exactly. |
| [rngFromState](Function.rngFromState.md) | Resume a PRNG from previously captured state - no warm-up, exact stream. |
| [sealHeadlessAmbient](Function.sealHeadlessAmbient.md) | Seal the deterministic clock + scheduler so a FRAMEWORK engine that reads them at RUN-TIME survives the replay self-check's (and the real replay isolate's) ambient ban. Call AFTER [applyHeadlessDom](Function.applyHeadlessDom.md) + [freezeClock](Function.freezeClock.md); this is server / replay side only (the live browser keeps the real clock + scheduler). |
| [seedRandom](Function.seedRandom.md) | Seed the engine-visible `Math.random` PERSISTENTLY on `scope` with a small deterministic PRNG (mulberry32 over the 4-word seed), so an engine that reads `Math.random` directly produces the same stream live and on replay. Use this for a framework that drives a fixed-step loop where seeding once per run is enough - vs [withDeterministicEnv](Function.withDeterministicEnv.md), which seeds per step + restores (for engines whose render-side code between steps must NOT consume the stream). |
| [sin](Function.sin.md) | - |
| [sinh](Function.sinh.md) | - |
| [swapMath](Function.swapMath.md) | - |
| [swapMathInto](Function.swapMathInto.md) | Swap the non-deterministic transcendentals on an ALREADY-RESOLVED `math` object (see [resolveMathScope](Function.resolveMathScope.md)) to the [capMath](Variable.capMath.md) kernels. The primitive behind [swapMath](Function.swapMath.md); a caller that already holds the resolved `math` (e.g. to also ban `Math.random` on it) uses this to avoid re-resolving. Returns the names it swapped. |
| [tan](Function.tan.md) | - |
| [tanh](Function.tanh.md) | - |
| [withDeterministicEnv](Function.withDeterministicEnv.md) | Run `fn` with the full deterministic environment installed, then RESTORE the originals afterward (even if `fn` throws). For the duration of `fn`: the transcendental `Math.*` are swapped to [capMath](Variable.capMath.md), `Math.random` is the seeded `env.random`, and `Date.now` / `performance.now` return `env.nowMs`. |
