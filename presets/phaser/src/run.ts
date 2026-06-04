import type Phaser from 'phaser';
import type { RunFn, Seed, Verdict } from '@caputchin/replay-contract';
import { makeDeterministic, seedRandom, applyHeadlessDom, freezeClock, createMathRandomTrap, type MathRandomTrap } from '@caputchin/determinism';
import { bootHeadlessPhaser } from './boot.js';

/** What the driver gives the replay scene for a round. */
export interface PhaserRunContext<Action, C = unknown> {
  /** The round seed (server-derived). */
  readonly seed: Seed;
  /** Server-resolved config, or `null` for the sim's defaults. */
  readonly config: C | null;
  /** The decoded per-tick actions (index = fixed-physics-step / worldstep). */
  readonly actions: readonly Action[];
  /** Seeded `Math.random` trap, pre-reset to `seed`. Wrap the stepped sim (the
   *  onWorldStep callback) in `trap.run(...)` — and do the IDENTICAL wrap on the
   *  live side — so any raw `Math.random` read in the step is symmetric live vs
   *  replay. A no-op if the sim only uses the seeded gameplay RNG. */
  readonly trap: MathRandomTrap;
}

/** A built replay scene: the Phaser scene config plus readers for the verdict.
 *  The scene's `create()` MUST subscribe its per-tick logic to the Arcade
 *  `worldstep` event (use {@link onWorldStep}), advancing one action per step, so
 *  the headless replay tracks the live recording exactly. */
export interface PhaserSceneHandle {
  /** A Phaser scene config object (at least `create`). */
  readonly scene: object;
  /** How many fixed physics steps have elapsed (the scene's worldstep counter). */
  tickCount(): number;
  /** True once the round has ended. */
  isOver(): boolean;
  /** The terminal score + pass decision. */
  result(): { score: number; passed: boolean };
}

/** Options for {@link makePhaserRun}. */
export interface MakePhaserRunOptions<Action, C = unknown> {
  readonly width: number;
  readonly height: number;
  /** Phaser physics config (e.g. `{ default: 'arcade', arcade: { fixedStep: true, fps: 60 } }`).
   *  Arcade is made deterministic by the preset: fixed step + seeded RNG +
   *  deterministic transcendentals. Always set fixedStep + a fixed fps. */
  readonly physics?: Phaser.Types.Core.PhysicsConfig;
  /** Hard tick ceiling (guards the isolate cpuMs cap). */
  readonly maxTicks: number;
  /** Fixed timestep in ms. Defaults to 1000/60. MUST match the live game's fps. */
  readonly stepMs?: number;
  /** Decode the opaque trace into per-tick actions (index = tick). */
  decode(trace: Uint8Array | string): readonly Action[];
  /** Build the headless replay scene for a round. */
  createScene(ctx: PhaserRunContext<Action, C>): PhaserSceneHandle;
}

/**
 * Build a conforming `run(seed, config, trace) => Verdict` backed by a headless
 * Phaser game running REAL Phaser physics. The preset makes the physics
 * deterministic (fixed step + seeded RNG + deterministic transcendentals applied
 * here and, via `@caputchin/preset-phaser/live`, in the browser), so the same
 * scene the player ran replays bit-for-bit on the server.
 *
 * The driver advances `headlessStep` at a fixed delta (one worldstep per call)
 * until the recorded trace is exhausted or the round ends, then reads the verdict.
 */
export function makePhaserRun<Action, C = unknown>(opts: MakePhaserRunOptions<Action, C>): RunFn<C> {
  const stepMs = opts.stepMs ?? 1000 / 60;

  const run: RunFn<C> = async (seed, config, trace): Promise<Verdict> => {
    // Re-establish the full headless environment at the START of every run, not
    // just at module load: a prober (selfcheck) patches the banned globals (Date,
    // navigator, ...) around each run() call, so the DOM stubs + Math swap + frozen
    // clock installed at import are shadowed by the time Phaser boots here. Writing
    // our deterministic stubs over them (never reading the trapped globals) keeps
    // the boot deterministic in the isolate AND under the probe. Order matters:
    // applyHeadlessDom installs `performance` before freezeClock pins its `now`.
    // Gameplay randomness goes through the scene's Phaser.Math.RandomDataGenerator
    // (seedFromPlatform), and Arcade physics does not consume Math.random — but
    // Phaser reads Math.random internally, so seed it (per the round seed) to give
    // it a deterministic stream and overwrite the self-check probe.
    makeDeterministic();
    seedRandom(seed);
    applyHeadlessDom();
    freezeClock();

    // Per-step seeded Math.random trap, applied IDENTICALLY on the live side, so a
    // raw Math.random read inside the stepped sim is symmetric live vs replay (the
    // persistent seedRandom above covers Phaser's boot/internal reads; the trap
    // covers the verdict-affecting per-step callback).
    const trap = createMathRandomTrap();
    trap.reset(seed);

    const actions = opts.decode(trace);
    const handle = opts.createScene({ seed, config: config ?? null, actions, trap });

    const game = await bootHeadlessPhaser({
      width: opts.width,
      height: opts.height,
      physics: opts.physics,
      scene: handle.scene as Phaser.Types.Scenes.SettingsConfig,
    });
    game.loop?.stop();

    const stepper = game as Phaser.Game & { headlessStep(time: number, delta: number): void };
    const limit = Math.min(actions.length || opts.maxTicks, opts.maxTicks);
    const guardMax = opts.maxTicks + 8;
    let t = 0;
    let guard = 0;
    while (handle.tickCount() < limit && !handle.isOver() && guard < guardMax) {
      t += stepMs;
      stepper.headlessStep(t, stepMs);
      guard += 1;
    }

    const { score, passed } = handle.result();
    const durationMs = Math.round(handle.tickCount() * stepMs);
    game.destroy(true, true);

    return { passed, score, durationMs };
  };

  return run;
}
