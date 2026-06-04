// The shared scene installer — the heart of "live == replay by construction".
// Both the browser driver and the headless run mount the SAME author factory
// through this function; the only difference is the event source (live vs trace)
// and whether render-only work runs. Per tick: clear edges, apply this tick's
// inputs, run the author sim, advance the tick counter.

import type { KAPLAYCtx } from 'kaplay';
import type { GameContext } from '@caputchin/game-sdk';
import type { Seed } from '@caputchin/replay-contract';
import type { KaplayGame, KaplayGameApi } from './types';
import type { EventSource } from './source';
import type { MathRandomTrap } from '@caputchin/determinism';
import { InputState } from './input';
import { foldSeed } from './seed';

/** Mutable outcome the pump/driver reads after stepping the sim. */
export interface SceneOutcome {
  ticks: number;
  score: number;
  passed: boolean;
  over: boolean;
}

export interface InstallSceneOptions {
  readonly k: KAPLAYCtx;
  readonly game: KaplayGame;
  readonly seed: Seed;
  readonly source: EventSource;
  readonly ctx: GameContext | null;
  readonly headless: boolean;
  /** Shared, mutated in place as the sim runs. */
  readonly outcome: SceneOutcome;
  /** Seeded `Math.random` stream; reset here on scene-enter, beside `randSeed`. */
  readonly mathTrap: MathRandomTrap;
  /** Live input injection (push to the live source). Omit headless. */
  readonly inject?: (actionIndex: number, press: boolean) => void;
  /** Live ARIA live-region announcer. Omit headless. */
  readonly announce?: (message: string) => void;
  /** Fired once when the sim first latches a pass. */
  readonly onPass?: (score: number, tick: number) => void;
  /** Fired once when the sim ends the round. */
  readonly onGameOver?: (score: number, tick: number, passed: boolean) => void;
}

export function installScene(o: InstallSceneOptions): void {
  const { k, game, seed, source, ctx, headless, outcome, inject } = o;
  const actions = game.options.actions;
  const actionIndex = new Map<string, number>(actions.map((a, i) => [a, i]));
  const input = new InputState();
  let passFired = false;

  // Seed BOTH RNG rails at scene-enter (which the driver triggers only after
  // load, see session.ts), so they advance identically per tick in the browser
  // and the replay (the driver runs exactly one fixed-dt KAPLAY frame per tick in
  // both):
  //  - KAPLAY's own global RNG (`randSeed`), behind `k.rand()` and the api helpers
  //    below - the primary rail. The author may call `k.rand()` (or any seeded
  //    KAPLAY helper) directly.
  //  - `Math.random` (the trap), which KAPLAY's `shuffle()` / `chooseMultiple()`
  //    and any author `Math.random` read. Seeding it here makes those
  //    deterministic too, so the FULL engine is usable - they are no longer
  //    off-limits. (`api.shuffled` over `k.rand` is still offered for authors who
  //    want the pick on the primary rail.)
  k.randSeed(foldSeed(seed));
  o.mathTrap.reset(seed);
  const rnd = (): number => k.rand() as number;

  const api: KaplayGameApi = {
    get tick(): number {
      return outcome.ticks;
    },
    isDown: (a) => input.isDown(a),
    justPressed: (a) => input.justPressed(a),
    justReleased: (a) => input.justReleased(a),
    rand: rnd,
    randi: (n) => Math.floor(rnd() * n),
    randiRange: (min, max) => min + Math.floor(rnd() * (max - min + 1)),
    chance: (p) => rnd() < p,
    choose: (arr) => arr[Math.floor(rnd() * arr.length)] as never,
    shuffled: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        const tmp = out[i]!;
        out[i] = out[j]!;
        out[j] = tmp;
      }
      return out;
    },
    // The outcome FREEZES at game-over. A coarse pump frame can run extra
    // fixedUpdates past the over tick (more at the pump cadence than at the
    // browser's), so ignoring post-over mutations keeps the verdict the value it
    // had at the over tick, independent of frame cadence.
    setScore: (s) => {
      if (!outcome.over) outcome.score = s | 0;
    },
    pass: () => {
      if (outcome.over) return;
      outcome.passed = true;
      if (!passFired) {
        passFired = true;
        o.onPass?.(outcome.score, outcome.ticks);
      }
    },
    gameOver: () => {
      if (outcome.over) return;
      outcome.over = true;
      o.onGameOver?.(outcome.score, outcome.ticks, outcome.passed);
    },
    press: (a) => {
      const idx = actionIndex.get(a);
      if (idx !== undefined && inject) inject(idx, true);
    },
    release: (a) => {
      const idx = actionIndex.get(a);
      if (idx !== undefined && inject) inject(idx, false);
    },
    announce: (m) => o.announce?.(m),
    ctx,
    headless,
  };

  // FIRST fixed handler: clear edges + apply this tick's inputs, before the sim.
  k.onFixedUpdate(() => {
    if (outcome.over) return;
    input.beginTick();
    for (const e of source.eventsForTick(outcome.ticks)) {
      const name = actions[e.action];
      if (name !== undefined) input.apply(name, e.press);
    }
  });

  // The author builds the scene and registers its own onFixedUpdate sim.
  game.factory(k, api);

  // LAST fixed handler: advance the tick counter after the sim has run.
  k.onFixedUpdate(() => {
    if (outcome.over) return;
    outcome.ticks += 1;
  });
}
