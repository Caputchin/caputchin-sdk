// The headless driver: boot Excalibur under the shim on its 2D-canvas path, start
// it (empty loader; procedural games carry no external assets), then advance the
// engine one fixed step at a time over the recorded trace until the round ends.
// Same Runtime + same per-tick `runTick` the live driver uses, just paced as fast
// as possible instead of to wall-clock - so the replay reproduces live play. The
// engine's draw is disabled (a headless replay never renders, and the 2D context
// needs a real DOMMatrix in its transform path).

import * as ex from 'excalibur';
import type { Seed } from '@caputchin/replay-contract';
import type { ExcaliburGame, GameContext } from './types';
import { TraceSource } from './source';
import type { RecordedEvent } from './trace';
import { createRuntime, type Outcome } from './session';
import { FIXED_TIMESTEP_MS, FIXED_UPDATE_FPS } from './constants';

export interface PumpResult extends Outcome {
  /** The replay hit the tick ceiling without the sim ending (always a fail). */
  readonly truncated: boolean;
  readonly durationMs: number;
}

export async function pumpHeadless<C = unknown>(
  game: ExcaliburGame,
  seed: Seed,
  config: C | null,
  events: readonly RecordedEvent[],
): Promise<PumpResult> {
  // Put Excalibur on the 2D-canvas graphics path (no WebGL) for the headless
  // boot. Called here (not at module load) so importing the preset for the LIVE
  // mount does not force the live engine off WebGL. Flags freeze at first Engine
  // construction and re-enabling then throws, so enable once and skip thereafter
  // (the flag persists across the many engine boots a multi-round replay does).
  if (!ex.Flags.isEnabled('use-canvas-context')) {
    ex.Flags.useCanvasGraphicsContext();
  }
  // Quiet Excalibur's boot/GC warnings - they would spam the replay isolate logs.
  ex.Logger.getInstance().defaultLevel = ex.LogLevel.Error;

  const source = new TraceSource(events);
  const ctx: GameContext = {
    seed,
    locale: null,
    skin: null,
    config: config as GameContext['config'],
  };

  const engine = new ex.Engine({
    width: game.options.width,
    height: game.options.height,
    displayMode: ex.DisplayMode.Fixed,
    suppressConsoleBootMessage: true,
    suppressPlayButton: true,
    suppressHiDPIScaling: true,
    suppressMinimumBrowserFeatureDetection: true,
    garbageCollection: false,
    fixedUpdateFps: FIXED_UPDATE_FPS,
  });
  // Headless never renders.
  (engine as unknown as { _draw: () => void })._draw = () => {};

  const runtime = createRuntime({ engine, game, seed, ctx, headless: true, source });

  await engine.start();
  // Native pointer events headless: runTick injects the recorded trace via
  // engine.input.pointers.triggerEvent, which round-trips the position through the
  // screen's world<->page<->screen transforms. Those have no real canvas bounds
  // headless, so force them to identity - the injected world coordinate then reaches
  // the PointerSystem (Actor hit-testing) unchanged. Enable the receiver so its
  // `_handle` does not early-return.
  const scr = engine.screen as unknown as Record<string, (v: ex.Vector) => ex.Vector>;
  scr.worldToPageCoordinates = (v) => v;
  scr.pageToScreenCoordinates = (v) => v;
  scr.screenToWorldCoordinates = (v) => v;
  engine.input.pointers.toggleEnabled(true);
  // Wire the per-tick sim to the engine's per-`_update` event, then drive the
  // engine by hand. Attached AFTER start() so loading-phase updates (which emit
  // no preupdate anyway) never advance the sim tick.
  engine.on('preupdate', () => runtime.runTick());
  const clock = engine.debug.useTestClock();

  const { outcome } = runtime;
  const maxTicks = game.options.maxTicks;

  // Run until the sim ends (gameOver) or the tick ceiling. A SUBMITTED trace
  // always corresponds to a passed round, and a conforming sim calls gameOver when
  // it passes (or fails, or its time budget elapses), so it self-terminates well
  // before maxTicks; a sim that never ends hits the ceiling. `steps` guards against
  // a tick that fails to advance (no preupdate fired).
  const guardMax = maxTicks + 8;
  let steps = 0;
  while (steps < guardMax) {
    if (outcome.over) break;
    if (outcome.tick >= maxTicks) break;
    clock.step(FIXED_TIMESTEP_MS);
    steps += 1;
  }
  // ANY exit that did not reach gameOver is a fail: the maxTicks ceiling, or a
  // guard-stall (no preupdate advancing the tick). This closes a forged pass where
  // a non-conforming sim latched `passed` without `gameOver` and then stalled.
  const truncated = !outcome.over;

  try {
    engine.dispose();
  } catch {
    /* best effort */
  }

  return { ...outcome, truncated, durationMs: outcome.tick * FIXED_TIMESTEP_MS };
}
