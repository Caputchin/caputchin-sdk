// Minimal headless DOM shim - an OPTIONAL kit helper for the framework path.
// A framework-headless sim (Phaser, Pixi, PlayCanvas, …) expects
// `document` / `window` / a `<canvas>` to exist even when nothing renders. This
// installs deterministic no-op stubs so such a sim can instantiate inside a
// sealed isolate that has no real DOM, WITHOUT pulling in real rendering,
// layout, or wall-clock.
//
// Determinism: every stub returns fixed values - fixed viewport size, no
// measured layout, and `requestAnimationFrame` that NEVER schedules a callback
// (the sim is advanced by the kit's fixed-step loop, not by rAF). Rendering
// calls are swallowed: the renderer draws into the void and cannot affect the
// sim, so it cannot affect the verdict.
//
// It is orthogonal to (and mutually exclusive with) the neutralization shim:
// the framework path needs `navigator` / rAF that the neutralization shim bans,
// so apply ONE - `applyDomShim` for the framework lane, `applyShim` for the
// bare lane. A per-engine preset (Phase 7+) builds on this minimal surface.

type AnyRecord = Record<string, unknown>;

const VIEWPORT_W = 800;
const VIEWPORT_H = 600;

const noop = (): void => undefined;

/** A no-op 2D/GL-ish context: every method swallows, data getters are benign. */
function makeContext(canvas: object): unknown {
  const store: AnyRecord = {};
  return new Proxy(store, {
    get(target, key) {
      if (key === 'canvas') return canvas;
      if (key in target) return target[key as string];
      if (typeof key === 'symbol') return undefined;
      if (key === 'measureText') return () => ({ width: 0 });
      if (key === 'getImageData' || key === 'createImageData') {
        return (...args: number[]) => {
          const w = Math.max(0, args[args.length - 2] ?? 0);
          const h = Math.max(0, args[args.length - 1] ?? 0);
          return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
        };
      }
      if (key === 'getContextAttributes') return () => ({});
      if (key === 'getParameter') return () => 0;
      if (key === 'getExtension') return () => null;
      // Any other property is treated as a chainable no-op method.
      return noop;
    },
    set(target, key, value) {
      target[key as string] = value;
      return true;
    },
  });
}

function makeCanvas(): object {
  const canvas: AnyRecord = { width: VIEWPORT_W, height: VIEWPORT_H, style: {} };
  canvas.getContext = () => makeContext(canvas);
  canvas.addEventListener = noop;
  canvas.removeEventListener = noop;
  canvas.toDataURL = () => 'data:,';
  canvas.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: VIEWPORT_W,
    bottom: VIEWPORT_H,
    width: VIEWPORT_W,
    height: VIEWPORT_H,
  });
  return canvas;
}

function makeElement(tag: string): object {
  if (tag.toLowerCase() === 'canvas') return makeCanvas();
  return {
    tagName: tag.toUpperCase(),
    style: {},
    children: [] as unknown[],
    appendChild: (c: unknown) => c,
    removeChild: (c: unknown) => c,
    setAttribute: noop,
    getAttribute: () => null,
    addEventListener: noop,
    removeEventListener: noop,
    getContext: () => null,
  };
}

function makeDocument(): object {
  return {
    createElement: (tag: string) => makeElement(tag),
    createElementNS: (_ns: string, tag: string) => makeElement(tag),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [] as unknown[],
    addEventListener: noop,
    removeEventListener: noop,
    documentElement: makeElement('html'),
    body: makeElement('body'),
    head: makeElement('head'),
    readyState: 'complete',
  };
}

function makeWindow(doc: object): object {
  return {
    innerWidth: VIEWPORT_W,
    innerHeight: VIEWPORT_H,
    devicePixelRatio: 1,
    document: doc,
    navigator: { userAgent: 'caputchin-replay', language: 'en', hardwareConcurrency: 1 },
    addEventListener: noop,
    removeEventListener: noop,
    // Never schedules: a headless sim is tick-driven, not rAF-driven, so firing
    // a wall-clock callback here would be a determinism hole.
    requestAnimationFrame: (_cb: unknown) => 0,
    cancelAnimationFrame: noop,
    matchMedia: () => ({
      matches: false,
      addEventListener: noop,
      removeEventListener: noop,
      addListener: noop,
      removeListener: noop,
    }),
  };
}

/**
 * Install the headless DOM stubs onto the given scope (default `globalThis`).
 * Idempotent; call once before instantiating a framework-headless sim. Returns
 * the names it installed (for diagnostics/tests). Frameworks reach for these as
 * bare globals, so `document` / `navigator` / `requestAnimationFrame` are
 * hoisted onto the scope alongside `window`.
 */
export function applyDomShim(scope: object = globalThis): string[] {
  const g = scope as AnyRecord;
  const doc = makeDocument();
  const win = makeWindow(doc) as AnyRecord;

  const installed: string[] = [];
  const set = (name: string, value: unknown): void => {
    try {
      g[name] = value;
      installed.push(name);
    } catch {
      // non-configurable on this host - best effort
    }
  };

  set('window', win);
  set('self', win);
  set('document', doc);
  set('navigator', win.navigator);
  set('requestAnimationFrame', win.requestAnimationFrame);
  set('cancelAnimationFrame', win.cancelAnimationFrame);
  set('matchMedia', win.matchMedia);
  set('devicePixelRatio', win.devicePixelRatio);

  return installed;
}
