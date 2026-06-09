import type { Engine } from 'excalibur';
import type { Seed } from '@caputchin/replay-contract';
import type { Bridge, GameContext } from '@caputchin/game-sdk';
import type { PointerKind } from './trace';

export type { Seed, Bridge, GameContext };

/** A pointer event the sim sees this tick, in the game's fixed world space. */
export interface ApiPointerEvent {
  /** 0 = down, 1 = move, 2 = up. */
  readonly kind: PointerKind;
  readonly x: number;
  readonly y: number;
}

/** Live pointer state for the current tick. */
export interface ApiPointer {
  /** Whether the pointer is currently pressed. */
  readonly isDown: boolean;
  /** Last known pointer position in world space (the latest move/down this round). */
  readonly x: number;
  readonly y: number;
  /** Pointer events that landed on THIS tick, in order - the rich-gesture channel
   *  (a slash / drag is a run of these). Empty on ticks with no pointer input. */
  readonly events: readonly ApiPointerEvent[];
}

/**
 * The deterministic API a sim reads each fixed tick. The SAME object is handed to
 * the game factory in the browser and in the headless replay, so sim code written
 * against it reproduces identically both ends.
 *
 * Read input ONLY through this api (pointer + named actions) and randomness ONLY
 * through `rand*` (the preset's seeded RNG). Never read `engine.input`, the wall
 * clock, the network, `Math.random`, or `Date` from sim code.
 */
export interface ExcaliburGameApi {
  /** Current logical sim tick (0-based; tick 0 is the first fixed update after the scene starts). */
  readonly tick: number;

  /** Pointer input - the primary (rich-gesture) channel. */
  readonly pointer: ApiPointer;

  /** Whether `action` is currently held. */
  isDown(action: string): boolean;
  /** Whether `action` went down on THIS tick. */
  justPressed(action: string): boolean;
  /** Whether `action` was released on THIS tick. */
  justReleased(action: string): boolean;

  /** Next seeded float in [0, 1). */
  rand(): number;
  /** Seeded integer in [0, maxExclusive). */
  randi(maxExclusive: number): number;
  /** Seeded integer in [min, maxInclusive]. */
  randiRange(min: number, maxInclusive: number): number;
  /** True with probability `p`, seeded. */
  chance(p: number): boolean;
  /** Seeded pick from a non-empty array. */
  choose<T>(arr: readonly T[]): T;

  /** Set the current score (carried into the verdict). */
  setScore(score: number): void;
  /** Latch the pass: the captcha is satisfied at the current score. Idempotent. */
  pass(): void;
  /** End the round. The headless run stops; the live driver fires the game-over flow. */
  gameOver(): void;

  /** Announce a game-state change to assistive tech (live only; no-op headless). */
  announce(message: string): void;

  /** Register a per-tick sim callback. Called once per fixed tick, AFTER this
   *  tick's input has been applied to the api, on both ends. The place to put all
   *  gate logic so live and replay run the identical code. */
  onTick(cb: () => void): void;

  /** Inject a live named-action edge (touch buttons / gamepad). No-op headless. */
  press(action: string): void;
  /** Live counterpart to {@link press}. No-op headless. */
  release(action: string): void;

  /** Server round context: `seed`, opaque `config`, and (live only) `locale`/`skin`.
   *  `config` is the ONLY safe source for gate-affecting params; read sim params
   *  from it, never from input. */
  readonly ctx: GameContext | null;
  /** True inside the headless replay; false in the browser. Guard render-only setup with this. */
  readonly headless: boolean;
}

/** The author's game builder: set up the scene (sim always; render guarded by
 *  `api.headless`), then register `api.onTick` sim logic and (live) wire input. */
export type ExcaliburGameFactory = (engine: Engine, api: ExcaliburGameApi) => void;

/** Options for {@link defineExcaliburGame}. */
export interface ExcaliburGameOptions {
  /** Fixed world width the sim reasons in (pointer coords are in this space). */
  readonly width: number;
  /** Fixed world height the sim reasons in. */
  readonly height: number;
  /**
   * Ordered named-action names (optional; pointer games may omit). The index is
   * the wire code, so APPEND new actions, never reorder or remove.
   */
  readonly actions?: readonly string[];
  /** Max sim ticks before a replay is declared truncated (and rejected). */
  readonly maxTicks: number;
}

/** An Excalibur game ready to mount live or replay headless. Build with {@link defineExcaliburGame}. */
export interface ExcaliburGame {
  readonly factory: ExcaliburGameFactory;
  readonly options: ExcaliburGameOptions;
}

/** Args for {@link mountExcaliburGame}. Mirrors the SDK `register` callback parameters. */
export interface MountArgs {
  readonly container: HTMLElement;
  readonly bridge: Bridge;
  readonly ctx?: GameContext;
}
