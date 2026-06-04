// The shared determinism core. Both the live driver (mount.ts) and the headless
// replay (pump.ts) build a Session over an already-booted, Math-deterministic
// KAPLAY context. The Session registers the game's asset loads, defines the
// scene, and exposes a single `frame()` that advances KAPLAY by EXACTLY ONE
// fixed-dt frame. The driver calls `frame()` at its own pace (live: a real-rAF
// accumulator pacing to wall-clock; headless: as fast as possible) - the
// virtual-time sequence handed to KAPLAY is identical either way, so KAPLAY
// executes identically.
//
// The game scene is entered ONLY once loading is complete, so the variable
// number of loading-phase frames (real time vs pump) never reaches the sim's RNG
// or physics: the scene re-seeds the RNG on enter and starts from a clean state.

import type { KAPLAYCtx } from 'kaplay';
import type { GameContext } from '@caputchin/game-sdk';
import type { Seed } from '@caputchin/replay-contract';
import type { KaplayGame } from './types';
import type { EventSource } from './source';
import { installScene, type SceneOutcome } from './scene';
import { createMathRandomTrap } from '@caputchin/determinism';
import { FIXED_TIMESTEP_MS } from './constants';

const SCENE = '__caputchin__';

export interface SessionOptions {
  readonly k: KAPLAYCtx;
  /** Run KAPLAY's captured frame callback at timestamp `tMs` (advances one frame). */
  readonly flushFrame: (tMs: number) => void;
  readonly game: KaplayGame;
  readonly seed: Seed;
  readonly ctx: GameContext | null;
  readonly headless: boolean;
  readonly source: EventSource;
  readonly inject?: (actionIndex: number, press: boolean) => void;
  readonly announce?: (message: string) => void;
  readonly onPass?: (score: number, tick: number) => void;
  readonly onGameOver?: (score: number, tick: number, passed: boolean) => void;
}

export interface Session {
  readonly outcome: SceneOutcome;
  /** Advance KAPLAY by one fixed-dt frame, entering the game scene once loaded. */
  frame(): void;
  /** Whether all assets have loaded (loadProgress == 1). */
  loaded(): boolean;
  /** Whether the game scene has been entered. */
  started(): boolean;
}

export function createSession(o: SessionOptions): Session {
  const { k, flushFrame, game } = o;
  const outcome: SceneOutcome = { ticks: 0, score: 0, passed: false, over: false };

  // Backs `Math.random` with a seeded stream during each frame, so KAPLAY's
  // `Math.random`-based helpers (shuffle/chooseMultiple) and any author
  // `Math.random` are deterministic too. Reset at scene-enter (see installScene),
  // installed around `flushFrame` below.
  const mathTrap = createMathRandomTrap();

  // Register the game's asset loads (so loadProgress accounts for them) before
  // the scene is defined and before the scene is entered.
  game.options.load?.(k);

  k.scene(SCENE, () =>
    installScene({
      k,
      game,
      seed: o.seed,
      source: o.source,
      ctx: o.ctx,
      headless: o.headless,
      outcome,
      mathTrap,
      inject: o.inject,
      announce: o.announce,
      onPass: o.onPass,
      onGameOver: o.onGameOver,
    }),
  );

  let started = false;
  let vt = 0;

  return {
    outcome,
    loaded: () => k.loadProgress() >= 1,
    started: () => started,
    frame(): void {
      vt += FIXED_TIMESTEP_MS;
      // Seed `Math.random` for exactly this KAPLAY frame (we own the loop, so
      // KAPLAY runs only inside flushFrame); the real one is restored between
      // frames so live-only between-frame code never advances the seeded stream.
      mathTrap.run(() => flushFrame(vt));
      // Enter the game scene exactly once, after everything has loaded, so the
      // sim starts deterministically (re-seeded RNG, no loading-frame draws).
      // go() takes effect on the next frame.
      if (!started && k.loadProgress() >= 1) {
        started = true;
        k.go(SCENE);
      }
    },
  };
}

export { SCENE };
