// `mountKaplayGame` - the live browser driver. It makes Math deterministic,
// captures KAPLAY's rAF, and drives KAPLAY at a FIXED timestep paced to
// wall-clock via a real-rAF accumulator - the exact same fixed-dt frames the
// headless replay pumps, just at real-time speed. Because both ends run the same
// scene over the same fixed-dt frames with deterministic Math + seeded RNG, the
// server reproduces the live result.

import kaplay from 'kaplay';
import type { KAPLAYCtx } from 'kaplay';
import { makeDeterministic } from '@caputchin/determinism';
import { randomSeed } from '@caputchin/game-sdk';
import type { Seed } from '@caputchin/replay-contract';
import type { KaplayGame, MountArgs } from './types';
import { createSession } from './session';
import { domKeyToKaplay } from './keymap';
import { LiveSource } from './source';
import { encodeTrace } from './trace';
import { FIXED_TIMESTEP_MS, MAX_CATCHUP_FRAMES } from './constants';

type AnyRecord = Record<string, unknown>;

/**
 * Mount a {@link KaplayGame} live in the iframe. Call from the SDK `register`
 * callback: `register((container, bridge, ctx) => mountKaplayGame(game, { container, bridge, ctx }))`.
 * Returns a cleanup function.
 */
export function mountKaplayGame(game: KaplayGame, args: MountArgs): () => void {
  const { container, bridge, ctx } = args;
  const doc = container.ownerDocument;
  const win = (doc.defaultView ?? (globalThis as unknown)) as Window & AnyRecord;

  // Establish the iframe height chain so the canvas's height:100% resolves
  // against the iframe size instead of collapsing to content-height. The SDK
  // srcdoc sets margin/padding 0 on html+body but no height, and the mount
  // container is a plain <div>; without a definite height chain, percentage
  // heights fall back to auto and the responsive canvas below collapses to a tiny
  // board. The other first-party games inject the same fix (see leaf-memory
  // styles). Setting the container size directly keeps it robust to the host id.
  // Paint the iframe + container with the game's own background colour so the
  // letterbox bars (the empty space when the scaled game does not fill the
  // container) are seamless with the game's edges.
  const bg = (game.options.kaplay as AnyRecord | undefined)?.['background'];
  const bgCss =
    typeof bg === 'string'
      ? bg
      : Array.isArray(bg) && bg.length >= 3
        ? `rgb(${bg[0] | 0},${bg[1] | 0},${bg[2] | 0})`
        : '';
  try {
    if (!doc.getElementById('cpt-kaplay-fit')) {
      const fit = doc.createElement('style');
      fit.id = 'cpt-kaplay-fit';
      fit.textContent = `html,body{width:100%;height:100%;margin:0;overflow:hidden${bgCss ? `;background:${bgCss}` : ''}}`;
      doc.head.appendChild(fit);
    }
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    if (bgCss) container.style.background = bgCss;
  } catch {
    /* best effort - non-DOM host */
  }

  // The canvas is positioned ABSOLUTELY (out of flow) to fill the height:100%
  // container. KAPLAY auto-sizes its gfx to the canvas, but an in-flow canvas
  // feeds its size back into the runtime's content-measurement -> the iframe
  // grows -> the canvas grows (an unbounded loop + scrollbars). Out of flow, the
  // canvas just FILLS the container (whose size is anchored by the height chain),
  // so the measured content stays the iframe size and the loop never starts.
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
  live.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
  container.appendChild(live);
  const announce = (msg: string): void => {
    live.textContent = msg;
  };

  const seed: Seed = ctx?.seed ?? randomSeed();
  const source = new LiveSource();
  const actionIndex = new Map<string, number>(game.options.actions.map((a, i) => [a, i]));

  // Make Math deterministic for KAPLAY's physics, identical to the headless
  // replay. Snapshot to restore on cleanup.
  const mathScope = (win['Math'] as AnyRecord) ?? (Math as unknown as AnyRecord);
  const mathSnapshot: AnyRecord = {};
  for (const n of Object.getOwnPropertyNames(mathScope)) mathSnapshot[n] = mathScope[n];
  makeDeterministic(win);

  // Capture KAPLAY's rAF so WE own the loop. Drive it at a fixed timestep, paced
  // to wall-clock by the real rAF below - the determinism anchor.
  //
  // Capture into a KEYED QUEUE, not a single slot: KAPLAY is not the only thing
  // in this iframe that schedules an animation frame. The SDK iframe runtime
  // schedules a one-shot `requestAnimationFrame(measureDocumentSize)` right after
  // the game mounts. A single-slot capture let that call OVERWRITE KAPLAY's
  // pending frame, so KAPLAY's loop never ran again and the canvas stayed blank.
  // A map keyed by handle lets every scheduled callback run (KAPLAY's frame AND
  // the measure) and lets `cancelAnimationFrame` remove the right one (KAPLAY
  // cancels its loop handle when it restarts the loop on a scene change). Each
  // flush drains a SNAPSHOT, so a callback that re-arms (KAPLAY's frame does,
  // every frame) lands in the next flush - exactly one fixed-dt KAPLAY frame per
  // tick, unchanged.
  const realRaf = win.requestAnimationFrame.bind(win);
  const realCaf = win.cancelAnimationFrame.bind(win);
  let nextRafHandle = 1;
  const pendingFrames = new Map<number, (t: number) => void>();
  win['requestAnimationFrame'] = (cb: (t: number) => void): number => {
    const handle = nextRafHandle++;
    pendingFrames.set(handle, cb);
    return handle;
  };
  win['cancelAnimationFrame'] = (handle: number): void => {
    pendingFrames.delete(handle);
  };
  const captureFlush = (vt: number): void => {
    if (pendingFrames.size === 0) return;
    const batch = [...pendingFrames.values()];
    pendingFrames.clear();
    for (const f of batch) f(vt);
  };

  // Drop the game's fixed virtual resolution for the LIVE canvas so KAPLAY sizes
  // its gfx to the (container-filling) canvas at NATIVE resolution - the scene is
  // drawn crisply at the display size, not a fixed 270x480 framebuffer scaled up
  // (which pixelates). The author's scene reads k.width()/k.height() (the layout
  // already does) to scale-to-fit + centre + paint its own background out to the
  // edges, so the fit is crisp + seamless. The HEADLESS replay keeps the fixed
  // nominal size (pump.ts unchanged): it renders nothing and the sim reads NO
  // dimensions, so live==replay is unaffected.
  const k: KAPLAYCtx = kaplay({
    ...game.options.kaplay,
    width: undefined,
    height: undefined,
    canvas,
    global: false,
  });

  // Keyboard -> live source. We deliberately do NOT use KAPLAY's `onKeyPress`:
  // KAPLAY binds keydown to the CANVAS (and gates input on
  // `document.activeElement === canvas`), so its key callbacks fire only while the
  // canvas is the focused element. Inside the sandboxed game iframe that focus is
  // brittle - a click reaches KAPLAY's mouse (bound to `window`) and starts play,
  // but the canvas frequently is NOT the active element afterwards, so arrows /
  // WASD / space silently do nothing. Binding keydown/keyup on the iframe DOCUMENT
  // instead makes the keyboard work whenever the iframe itself is focused (true
  // after any click in the game), independent of canvas focus. The pushed edge is
  // drained + tick-stamped at the next fixed tick exactly as a touch edge is, so
  // the recording - and therefore the headless replay - is identical either way.
  const keys = game.options.keys ?? {};
  const keyToAction = new Map<string, number>();
  for (const action of Object.keys(keys)) {
    const idx = actionIndex.get(action);
    if (idx === undefined) continue;
    for (const key of keys[action] ?? []) keyToAction.set(key, idx);
  }
  // `domKeyToKaplay` reproduces KAPLAY's own DOM-key normalization, so a bound key
  // fires the same action the canvas listener would have (see keymap.ts).
  const onKeyDown = (e: KeyboardEvent): void => {
    const idx = keyToAction.get(domKeyToKaplay(e.key));
    if (idx === undefined) return;
    e.preventDefault(); // arrows / space would otherwise scroll the host page
    if (e.repeat) return; // OS auto-repeat is not a new press edge
    source.push(idx, true);
  };
  const onKeyUp = (e: KeyboardEvent): void => {
    const idx = keyToAction.get(domKeyToKaplay(e.key));
    if (idx === undefined) return;
    source.push(idx, false);
  };
  doc.addEventListener('keydown', onKeyDown);
  doc.addEventListener('keyup', onKeyUp);

  let bestPassed = -1;
  const session = createSession({
    k,
    flushFrame: captureFlush,
    game,
    seed,
    ctx: ctx ?? null,
    headless: false,
    source,
    inject: (idx, press) => source.push(idx, press),
    announce,
    onPass: (score) => {
      if (score > bestPassed) {
        bestPassed = score;
        bridge.pass({ trace: encodeTrace(source.recorded) });
      }
    },
  });

  // Real-rAF accumulator: advance the fixed-dt frames at wall-clock pace, with
  // bounded catch-up after a stall. The per-frame delta added to the accumulator
  // is CLAMPED to one catch-up budget: when the tab is backgrounded the browser
  // pauses rAF, so on return `realT - last` is the whole hidden duration. Without
  // the clamp that excess would drain over many loops at MAX_CATCHUP_FRAMES each
  // -> the game speed-runs for a second. Clamping discards the hidden time, so a
  // backgrounded tab behaves like a pause and resumes at normal speed.
  const MAX_FRAME_DELTA = MAX_CATCHUP_FRAMES * FIXED_TIMESTEP_MS;
  let disposed = false;
  let acc = 0;
  let last: number | null = null;
  let rafHandle = 0;
  const loop = (realT: number): void => {
    if (disposed) return;
    if (last !== null) acc += Math.min(realT - last, MAX_FRAME_DELTA);
    last = realT;
    let steps = Math.min(MAX_CATCHUP_FRAMES, Math.floor(acc / FIXED_TIMESTEP_MS));
    acc -= steps * FIXED_TIMESTEP_MS;
    for (; steps > 0; steps--) session.frame();
    rafHandle = realRaf(loop);
  };
  rafHandle = realRaf(loop);

  return function cleanup(): void {
    disposed = true;
    try {
      doc.removeEventListener('keydown', onKeyDown);
      doc.removeEventListener('keyup', onKeyUp);
    } catch {
      /* best effort */
    }
    try {
      realCaf(rafHandle);
    } catch {
      /* best effort */
    }
    try {
      win['requestAnimationFrame'] = realRaf;
      win['cancelAnimationFrame'] = realCaf;
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
      (k as unknown as { quit?: () => void }).quit?.();
    } catch {
      /* best effort */
    }
    canvas.remove();
    live.remove();
  };
}
