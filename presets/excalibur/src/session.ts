// The shared determinism core. Both the live driver (mount.ts) and the headless
// pump (pump.ts) build a Runtime over an already-constructed Excalibur engine. The
// Runtime builds the deterministic api, runs the author's factory once, and
// exposes `runTick()` - applies one tick's input to the api then runs the author's
// onTick sim logic. The driver wires `runTick` to the engine's per-`_update`
// `preupdate` event and advances the engine one fixed step at a time
// (`clock.step(FIXED_TIMESTEP_MS)`): live paces those steps to wall-clock, headless
// runs them as fast as possible. The virtual-time sequence handed to Excalibur is
// identical either way, so the engine - and the sim it hosts - executes identically.

import * as ex from 'excalibur';
import { rng } from '@caputchin/determinism';
import type { Seed } from '@caputchin/replay-contract';
import type { ApiPointerEvent, ExcaliburGame, ExcaliburGameApi, GameContext } from './types';
import type { EventSource } from './source';

/** Mutable round outcome, read by the driver to decide when to stop. */
export interface Outcome {
  /** Number of fixed ticks run so far (also the next tick index). */
  tick: number;
  score: number;
  passed: boolean;
  /** Round ended (gameOver latched). */
  over: boolean;
}

export interface RuntimeOptions {
  readonly engine: ex.Engine;
  readonly game: ExcaliburGame;
  readonly seed: Seed;
  readonly ctx: GameContext | null;
  readonly headless: boolean;
  readonly source: EventSource;
  readonly onPass?: (score: number, tick: number) => void;
  readonly onGameOver?: (score: number, tick: number, passed: boolean) => void;
  readonly announce?: (message: string) => void;
  /** Inject a named-action edge into the live source (no-op headless). */
  readonly injectAction?: (actionIndex: number, press: boolean) => void;
}

export interface Runtime {
  readonly api: ExcaliburGameApi;
  readonly outcome: Outcome;
  /** Apply this tick's input to the api, run the author's onTick logic, advance the tick. */
  runTick(): void;
}

export function createRuntime(o: RuntimeOptions): Runtime {
  const outcome: Outcome = { tick: 0, score: 0, passed: false, over: false };
  const r = rng(o.seed);

  const actions = o.game.options.actions ?? [];
  const actionIndex = new Map<string, number>(actions.map((a, i) => [a, i]));
  const held = new Set<number>();
  let justPressed = new Set<number>();
  let justReleased = new Set<number>();

  let ptrDown = false;
  let ptrX = 0;
  let ptrY = 0;
  let ptrEvents: ApiPointerEvent[] = [];

  const tickCbs: Array<() => void> = [];

  const pointer = {
    get isDown(): boolean {
      return ptrDown;
    },
    get x(): number {
      return ptrX;
    },
    get y(): number {
      return ptrY;
    },
    get events(): readonly ApiPointerEvent[] {
      return ptrEvents;
    },
  };

  const api: ExcaliburGameApi = {
    get tick(): number {
      return outcome.tick;
    },
    pointer,
    isDown: (a) => {
      const i = actionIndex.get(a);
      return i !== undefined && held.has(i);
    },
    justPressed: (a) => {
      const i = actionIndex.get(a);
      return i !== undefined && justPressed.has(i);
    },
    justReleased: (a) => {
      const i = actionIndex.get(a);
      return i !== undefined && justReleased.has(i);
    },
    rand: () => r.next(),
    randi: (n) => r.int(n),
    randiRange: (min, max) => r.intBetween(min, max),
    chance: (p) => r.bool(p),
    choose: (arr) => r.pick(arr),
    setScore: (s) => {
      outcome.score = s;
    },
    pass: () => {
      if (!outcome.passed) {
        outcome.passed = true;
        o.onPass?.(outcome.score, outcome.tick);
      }
    },
    gameOver: () => {
      if (!outcome.over) {
        outcome.over = true;
        o.onGameOver?.(outcome.score, outcome.tick, outcome.passed);
      }
    },
    announce: (m) => o.announce?.(m),
    onTick: (cb) => {
      tickCbs.push(cb);
    },
    press: (a) => {
      const i = actionIndex.get(a);
      if (i !== undefined) o.injectAction?.(i, true);
    },
    release: (a) => {
      const i = actionIndex.get(a);
      if (i !== undefined) o.injectAction?.(i, false);
    },
    ctx: o.ctx,
    headless: o.headless,
  };

  // Build the scene + register onTick logic + (live) wire input. Runs once.
  o.game.factory(o.engine, api);

  function runTick(): void {
    if (outcome.over) return;
    // Reset per-tick edges.
    justPressed = new Set<number>();
    justReleased = new Set<number>();
    ptrEvents = [];

    for (const ev of o.source.eventsForTick(outcome.tick)) {
      if (ev.t === 0) {
        ptrEvents.push({ kind: ev.k, x: ev.x, y: ev.y });
        // Feed the engine's NATIVE input system so Actors' pointer handlers + the
        // PointerSystem (hit-testing) run from the recorded trace, identically on both
        // ends. Live, mount.ts detaches Excalibur's own DOM listeners so this injected
        // stream is the sole pointer source (no double-dispatch).
        const kind = ev.k === 0 ? 'down' : ev.k === 1 ? 'move' : 'up';
        o.engine.input.pointers.triggerEvent(kind, ex.vec(ev.x, ev.y));
        if (ev.k === 0) {
          ptrDown = true;
          ptrX = ev.x;
          ptrY = ev.y;
        } else if (ev.k === 1) {
          ptrX = ev.x;
          ptrY = ev.y;
        } else {
          ptrDown = false;
        }
      } else {
        if (ev.press) {
          if (!held.has(ev.a)) justPressed.add(ev.a);
          held.add(ev.a);
        } else {
          if (held.has(ev.a)) justReleased.add(ev.a);
          held.delete(ev.a);
        }
      }
    }

    for (const cb of tickCbs) cb();
    outcome.tick += 1;
  }

  return { api, outcome, runTick };
}
