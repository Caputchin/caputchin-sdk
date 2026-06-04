# index

## Interfaces

| Interface | Description |
| ------ | ------ |
| [DeterministicEnv](index.Interface.DeterministicEnv.md) | The seeded randomness + fixed clock a [withDeterministicEnv](index.Function.withDeterministicEnv.md) call installs for the duration of one trapped function. The caller supplies the seeded stream (e.g. this kit's own rng), so the trap itself stays PRNG-agnostic. |
| [MakePhaserRunOptions](index.Interface.MakePhaserRunOptions.md) | Options for [makePhaserRun](index.Function.makePhaserRun.md). |
| [MathRandomTrap](index.Interface.MathRandomTrap.md) | A seed-then-restore trap for `Math.random`, scoped to a stepped callback. Apply it IDENTICALLY on both ends so any `Math.random` read inside the stepped sim consumes the SAME seeded stream live and on the server. |
| [PhaserRunContext](index.Interface.PhaserRunContext.md) | What the driver gives the replay scene for a round. |
| [PhaserSceneHandle](index.Interface.PhaserSceneHandle.md) | A built replay scene: the Phaser scene config plus readers for the verdict. The scene's `create()` MUST subscribe its per-tick logic to the Arcade `worldstep` event (use [onWorldStep](index.Function.onWorldStep.md)), advancing one action per step, so the headless replay tracks the live recording exactly. |

## Variables

| Variable | Description |
| ------ | ------ |
| [capMath](index.Variable.capMath.md) | The deterministic math surface. Import and call `cap.math.sin(...)` in engine code instead of `Math.sin(...)`. The shim also swaps `Math.*` transcendentals to point here as a runtime safety net. |

## Functions

| Function | Description |
| ------ | ------ |
| [applyHeadlessDom](index.Function.applyHeadlessDom.md) | Install the headless DOM stubs onto `scope` (default `globalThis`) so a browser-targeted game engine boots with no real DOM. Idempotent; call once before the engine evaluates on the server. Returns the names it installed (for diagnostics / tests). |
| [bootHeadlessPhaser](index.Function.bootHeadlessPhaser.md) | Boot a headless Phaser game and resolve once it is ready to be stepped. |
| [createMathRandomTrap](index.Function.createMathRandomTrap.md) | - |
| [freezeClock](index.Function.freezeClock.md) | Freeze the wall clock on `scope` to a fixed value so the headless replay reads no real time: `Date.now()` and (if present) `performance.now()` return `nowMs`, and `new Date()` yields a frozen instance. HEADLESS ONLY: live play must keep the real clock for rendering/audio, so it never calls this. |
| [makeDeterministic](index.Function.makeDeterministic.md) | Prepare `scope` to run deterministically. Currently this is [swapMath](index.Function.swapMath.md); it is the single composition point future deterministic stubs (clock, RNG) will be added to, so callers get the full environment from one call. Returns the names of the globals it touched. |
| [makePhaserRun](index.Function.makePhaserRun.md) | Build a conforming `run(seed, config, trace) => Verdict` backed by a headless Phaser game running REAL Phaser physics. The preset makes the physics deterministic (fixed step + seeded RNG + deterministic transcendentals applied here and, via `@caputchin/preset-phaser/live`, in the browser), so the same scene the player ran replays bit-for-bit on the server. |
| [mulberry32](index.Function.mulberry32.md) | mulberry32: a tiny PRNG with 32-bit state. Pure integer ops (`Math.imul`, shifts, xor) plus one float divide, so its stream is bit-identical across V8 builds (browser == server) and untouched by the deterministic-Math swap. Shared by [seedRandom](index.Function.seedRandom.md) and [createMathRandomTrap](index.Function.createMathRandomTrap.md). |
| [onWorldStep](index.Function.onWorldStep.md) | Subscribe a callback to fire ONCE per fixed Arcade physics step. |
| [seedFromPlatform](index.Function.seedFromPlatform.md) | Build Phaser's own seeded PRNG from the platform Seed. |
| [seedRandom](index.Function.seedRandom.md) | Seed the engine-visible `Math.random` PERSISTENTLY on `scope` with a small deterministic PRNG (mulberry32 over the 4-word seed), so an engine that reads `Math.random` directly produces the same stream live and on replay. Use this for a framework that drives a fixed-step loop where seeding once per run is enough - vs [withDeterministicEnv](index.Function.withDeterministicEnv.md), which seeds per step + restores (for engines whose render-side code between steps must NOT consume the stream). |
| [swapMath](index.Function.swapMath.md) | - |
| [withDeterministicEnv](index.Function.withDeterministicEnv.md) | Run `fn` with the full deterministic environment installed, then RESTORE the originals afterward (even if `fn` throws). For the duration of `fn`: the transcendental `Math.*` are swapped to [capMath](index.Variable.capMath.md), `Math.random` is the seeded `env.random`, and `Date.now` / `performance.now` return `env.nowMs`. |
