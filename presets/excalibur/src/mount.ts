// `mountExcaliburGame` - the live browser driver. It makes Math deterministic,
// boots Excalibur with the real canvas on its default (WebGL) renderer, and lets
// Excalibur's own fixed-update accumulator (fixedUpdateFps) advance the sim at a
// fixed 50 Hz - the SAME fixed-dt ticks the headless pump runs, just paced to
// wall-clock by the engine's standard clock. Each fixed `_update` fires one
// `preupdate`, which runs one `runTick`. Pointer input is captured from the DOM,
// converted to world space, recorded tick-stamped, and replayed on the server.
// Because both ends run the same factory over the same fixed-dt ticks with
// deterministic Math + the same seeded RNG, the server reproduces the live result.

import * as ex from 'excalibur';
import { makeDeterministic } from '@caputchin/determinism';
import { randomSeed } from '@caputchin/game-sdk';
import type { Seed } from '@caputchin/replay-contract';
import type { ExcaliburGame, GameContext, MountArgs } from './types';
import { createRuntime } from './session';
import { LiveSource } from './source';
import { encodeTrace } from './trace';
import type { PointerKind } from './trace';
import { FIXED_UPDATE_FPS } from './constants';

type AnyRecord = Record<string, unknown>;

/**
 * Mount an {@link ExcaliburGame} live in the iframe. Call from the SDK `register`
 * callback: `register((container, bridge, ctx) => mountExcaliburGame(game, { container, bridge, ctx }))`.
 * Returns a cleanup function.
 */
export function mountExcaliburGame(game: ExcaliburGame, args: MountArgs): () => void {
  const { container, bridge, ctx } = args;
  const doc = container.ownerDocument;
  const win = (doc.defaultView ?? (globalThis as unknown)) as Window & AnyRecord;

  // Establish a definite height chain so the canvas's 100% sizing resolves
  // against the iframe instead of collapsing (same fix the other first-party
  // games inject). Idempotent per iframe.
  let injectedFit: Element | null = null;
  try {
    if (!doc.getElementById('cpt-excalibur-fit')) {
      const fit = doc.createElement('style');
      fit.id = 'cpt-excalibur-fit';
      fit.textContent = 'html,body{width:100%;height:100%;margin:0;overflow:hidden}';
      doc.head.appendChild(fit);
      injectedFit = fit;
    }
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
  } catch {
    /* best effort - non-DOM host */
  }

  const canvas = doc.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.touchAction = 'none';
  canvas.setAttribute('role', 'application');
  container.appendChild(canvas);

  // Polite ARIA live region (the canvas is opaque to screen readers).
  const live = doc.createElement('div');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  live.style.cssText =
    'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
  container.appendChild(live);
  const announce = (msg: string): void => {
    live.textContent = msg;
  };

  const seed: Seed = ctx?.seed ?? randomSeed();
  const source = new LiveSource();

  // Make Math deterministic for the sim, identical to the headless replay.
  // Snapshot to restore on cleanup.
  const mathScope = (win['Math'] as AnyRecord) ?? (Math as unknown as AnyRecord);
  const mathSnapshot: AnyRecord = {};
  for (const n of Object.getOwnPropertyNames(mathScope)) mathSnapshot[n] = mathScope[n];
  makeDeterministic(win as object);

  // Quiet Excalibur's boot banner / warnings in the iframe console.
  ex.Logger.getInstance().defaultLevel = ex.LogLevel.Error;

  const { width, height } = game.options;
  const engine = new ex.Engine({
    canvasElement: canvas as unknown as HTMLCanvasElement,
    resolution: { width, height },
    displayMode: ex.DisplayMode.FitContainer,
    suppressConsoleBootMessage: true,
    suppressPlayButton: true,
    antialiasing: true,
    fixedUpdateFps: FIXED_UPDATE_FPS,
  });
  // Default the camera so world (0,0) is the top-left of the fixed world and
  // (width,height) the bottom-right (matching the headless sim's coordinate
  // space). The author may re-position it in the factory.
  engine.currentScene.camera.pos = ex.vec(width / 2, height / 2);
  engine.currentScene.camera.zoom = 1;

  let bestPassed = -1;
  const liveCtx: GameContext = ctx ?? { seed, locale: null, skin: null, config: null };
  const runtime = createRuntime({
    engine,
    game,
    seed,
    ctx: liveCtx,
    headless: false,
    source,
    announce,
    injectAction: (idx, press) => source.pushAction(idx as number, press),
    onPass: (score) => {
      if (score > bestPassed) {
        bestPassed = score;
        bridge.pass({ trace: encodeTrace(source.recorded) });
      }
    },
  });

  // Pointer capture: convert each DOM event to world space and record it. Use
  // coalesced moves so a fast gesture keeps its full path (the rich-gesture
  // channel the U6 judge scores). The drained events are tick-stamped at the next
  // fixed tick, so the recording - and the headless replay - are identical.
  const toWorld = (pageX: number, pageY: number): { x: number; y: number } => {
    const w = engine.screen.pageToWorldCoordinates(ex.vec(pageX, pageY));
    return { x: w.x, y: w.y };
  };
  const pushPointer = (k: PointerKind, e: { pageX: number; pageY: number }): void => {
    const p = toWorld(e.pageX, e.pageY);
    source.pushPointer(k, p.x, p.y);
  };
  const onDown = (e: PointerEvent): void => {
    canvas.setPointerCapture?.(e.pointerId);
    pushPointer(0, e);
  };
  const onMove = (e: PointerEvent): void => {
    const coalesced =
      typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
    for (const ev of coalesced.length > 0 ? coalesced : [e]) pushPointer(1, ev);
  };
  const onUp = (e: PointerEvent): void => {
    pushPointer(2, e);
  };
  canvas.addEventListener('pointerdown', onDown, { passive: true });
  canvas.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerup', onUp, { passive: true });
  canvas.addEventListener('pointercancel', onUp, { passive: true });

  let disposed = false;
  void engine.start().then(() => {
    if (disposed) return;
    // Drive Actors' native pointer events from the RECORDED trace only: runTick
    // injects each captured event via engine.input.pointers.triggerEvent, so live
    // dispatch matches the headless replay exactly. Detach Excalibur's own DOM pointer
    // listeners so a real device event is not ALSO dispatched to Actors (our own
    // listeners above still capture it for the recording). The receiver stays enabled
    // so triggerEvent's `_handle` runs.
    engine.input.pointers.detach();
    engine.input.pointers.toggleEnabled(true);
    // Excalibur's standard clock (started by start()) runs the fixed-update loop;
    // each fixed _update emits one preupdate. Attach AFTER start so loading-phase
    // updates (which emit no preupdate) never advance the sim tick.
    engine.on('preupdate', () => runtime.runTick());
  });

  return function cleanup(): void {
    disposed = true;
    try {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      injectedFit?.remove();
    } catch {
      /* best effort */
    }
    try {
      engine.dispose();
    } catch {
      /* best effort */
    }
    for (const n of Object.keys(mathSnapshot)) {
      try {
        mathScope[n] = mathSnapshot[n];
      } catch {
        /* best effort */
      }
    }
    try {
      canvas.remove();
      live.remove();
    } catch {
      /* best effort */
    }
  };
}
