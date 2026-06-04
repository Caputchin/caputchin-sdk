import type { KAPLAYCtx, KAPLAYOpt } from 'kaplay';
import type { Seed } from '@caputchin/replay-contract';
import type { Bridge, GameContext } from '@caputchin/game-sdk';

export type { Seed, Bridge, GameContext };

/**
 * The deterministic API a KAPLAY sim reads each fixed tick. The SAME object is
 * handed to the scene factory in the browser and in the headless replay, so sim
 * code written against it reproduces identically both ends.
 *
 * Read input as named actions (declared in {@link KaplayGameOptions.actions}),
 * never raw keys, so the trace is input-device-agnostic. Randomness is free to
 * come from KAPLAY's own `k.rand()` (the preset seeds it and drives a fixed
 * timestep, so it is deterministic), these convenience helpers, KAPLAY's
 * `shuffle`/`chooseMultiple`, or even raw `Math.random()` in the sim - the preset
 * seeds `Math.random` too, so all of them reproduce both ends. Never read input,
 * a wall clock, or anything outside `api` and the seeded RNG.
 */
export interface KaplayGameApi {
  /** Current logical sim tick (0-based; tick 0 is the scene's first fixed update after load). */
  readonly tick: number;
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
  /** Seeded Fisher-Yates shuffle (does not mutate the input) on the `k.rand` rail. KAPLAY's own `shuffle` is also seeded now; this just keeps the pick on the primary rail. */
  shuffled<T>(arr: readonly T[]): T[];

  /** Set the current score (carried into the verdict). */
  setScore(score: number): void;
  /** Latch the pass: the captcha is satisfied at the current score. Idempotent. */
  pass(): void;
  /** End the round. The headless run stops; the live driver fires the game-over flow. */
  gameOver(): void;

  /**
   * Inject a live input (touch buttons, gamepad, custom). No-op in headless
   * (there the trace drives input). Call ONLY from live event handlers, never
   * from the sim (`onFixedUpdate`). Keyboard is wired automatically from
   * {@link KaplayGameOptions.keys}.
   */
  press(action: string): void;
  /** Live counterpart to {@link press}. No-op in headless. */
  release(action: string): void;

  /**
   * Announce a game-state change to assistive tech via the live driver's
   * polite ARIA live region (e.g. "two lines cleared", "game over"). No-op in
   * headless. The canvas is opaque to screen readers, so this is how a sim
   * surfaces state non-visually.
   */
  announce(message: string): void;

  /**
   * Server round context: `seed`, opaque `config`, and (live only) `locale` /
   * `skin`. `config` is present both ends and is the ONLY safe source for
   * gate-affecting params (pass threshold, board size); read sim params from it,
   * never from input. `locale`/`skin` are render-only and null in headless.
   */
  readonly ctx: GameContext | null;
  /** True inside the headless replay; false in the browser. Guard render-only setup with this. */
  readonly headless: boolean;
}

/** The author's scene builder: add objects, register `onFixedUpdate` sim logic, wire live input. */
export type KaplaySceneFactory = (k: KAPLAYCtx, api: KaplayGameApi) => void;

/** Options for {@link defineKaplayGame}: the action set, key bindings, the replay tick cap, and KAPLAY init options. */
export interface KaplayGameOptions {
  /**
   * Ordered action names. The index is the wire code in the trace, so APPEND
   * new actions; never reorder or remove (it would misread old traces).
   */
  readonly actions: readonly string[];
  /** Keyboard bindings per action for the live driver, e.g. `{ left: ['left', 'a'] }`. KAPLAY key names. */
  readonly keys?: Readonly<Record<string, readonly string[]>>;
  /** Max sim ticks before a replay is declared truncated (and rejected). Set above the longest legit round. */
  readonly maxTicks: number;
  /**
   * Optional asset-load hook, run once at boot before the scene is entered (e.g.
   * `k.loadSprite(...)`). The preset waits for all loads to finish before
   * starting the sim, so loading never perturbs determinism. Omit for a
   * procedural game with no assets.
   */
  readonly load?: (k: KAPLAYCtx) => void;
  /** KAPLAY init options merged into both ends (width/height/background/pixelDensity/...). `canvas`/`global` are managed by the preset. */
  readonly kaplay?: Partial<KAPLAYOpt>;
}

/** A KAPLAY game ready to mount live or replay headless. Build with {@link defineKaplayGame}. */
export interface KaplayGame {
  readonly factory: KaplaySceneFactory;
  readonly options: KaplayGameOptions;
}

/** Args for {@link mountKaplayGame}. Mirrors the SDK `register` callback parameters. */
export interface MountArgs {
  readonly container: HTMLElement;
  readonly bridge: Bridge;
  readonly ctx?: GameContext;
}
