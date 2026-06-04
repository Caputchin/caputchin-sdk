// Headless DOM boot shim: a shared no-op DOM surface a framework preset boots on
// instead of hand-rolling its own, WHEN its engine tolerates benign no-op contexts
// (Phaser, melonJS). It is a convenience, not a mandate: an engine that branches on
// richer success-shaped stubs (e.g. a live WebGL2 context that must hand back
// non-null buffer/texture/program handles or boot throws) still owns a bespoke
// shim, so this never has to satisfy every engine at once.
//
// A browser game engine (Phaser, Pixi, PlayCanvas, kaplay, melonJS, …) reaches for
// `window` / `document` / a `<canvas>` / `Image` / `screen` even when nothing
// renders. `applyHeadlessDom` installs deterministic no-op stubs so the engine
// instantiates inside a sealed isolate that has no real DOM, WITHOUT pulling in
// real rendering, layout, or a wall clock. HEADLESS ONLY (server / replay): never
// apply it in a real browser, it would shadow the live DOM.
//
// Determinism: every stub returns fixed values, namely a fixed viewport, no measured
// layout, and `requestAnimationFrame` that NEVER fires (the sim is advanced by a
// fixed-step loop, not by rAF). Rendering calls are swallowed: the renderer draws
// into the void and cannot affect the sim, so it cannot affect the verdict.
//
// It is orthogonal to (and mutually exclusive with) a NEUTRALIZATION shim (which
// bans `navigator` / rAF / … for the bare lane): a framework engine NEEDS those
// globals, so apply this for the framework lane instead. Wall-clock freezing is
// the separate {@link freezeClock} (so live play, which never calls it, keeps the
// real clock for rendering/audio while the headless replay freezes it).

type Stub = Record<string, unknown>;

const VIEWPORT_W = 800;
const VIEWPORT_H = 600;
const noop = (): void => undefined;

/** A no-op 2D/GL-ish context: every method swallows, data getters are benign. */
function makeContext(canvas: object): unknown {
  const store: Stub = {};
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
      if (key === 'createTexture' || key === 'createBuffer' || key === 'createFramebuffer') {
        return () => ({});
      }
      return noop;
    },
    set(target, key, value) {
      target[key as string] = value;
      return true;
    },
  });
}

function makeCanvas(): Stub {
  const canvas: Stub = { width: VIEWPORT_W, height: VIEWPORT_H, style: {}, nodeType: 1 };
  canvas.getContext = () => makeContext(canvas);
  canvas.addEventListener = noop;
  canvas.removeEventListener = noop;
  canvas.toDataURL = () => 'data:,';
  canvas.setAttribute = noop;
  canvas.getAttribute = () => null;
  canvas.appendChild = (c: unknown) => c;
  canvas.removeChild = (c: unknown) => c;
  canvas.getBoundingClientRect = () => ({
    x: 0, y: 0, top: 0, left: 0, right: VIEWPORT_W, bottom: VIEWPORT_H, width: VIEWPORT_W, height: VIEWPORT_H,
  });
  canvas.parentNode = null;
  return canvas;
}

// Loads synchronously-but-async: `src=` schedules the load callback on a
// microtask, so an engine's TextureManager (which waits for `onload`) advances
// without a real network/decoder. Fixed 1x1 dimensions keep it deterministic.
class ImageStub {
  width = 1;
  height = 1;
  naturalWidth = 1;
  naturalHeight = 1;
  complete = false;
  onload: ((ev: { target: ImageStub }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  private listeners: Record<string, ((ev: { target: ImageStub }) => void)[]> = {};
  private _src = '';
  set src(value: string) {
    this._src = value;
    void Promise.resolve().then(() => {
      this.complete = true;
      if (typeof this.onload === 'function') this.onload({ target: this });
      (this.listeners.load ?? []).forEach((fn) => fn({ target: this }));
    });
  }
  get src(): string {
    return this._src;
  }
  addEventListener(type: string, fn: (ev: { target: ImageStub }) => void): void {
    (this.listeners[type] ??= []).push(fn);
  }
  removeEventListener(type: string, fn: (ev: { target: ImageStub }) => void): void {
    this.listeners[type] = (this.listeners[type] ?? []).filter((f) => f !== fn);
  }
  decode(): Promise<void> {
    return Promise.resolve();
  }
}

function makeElement(tag: string): Stub {
  const t = String(tag).toLowerCase();
  if (t === 'canvas') return makeCanvas();
  if (t === 'img') return new ImageStub() as unknown as Stub;
  return {
    tagName: t.toUpperCase(),
    style: {},
    nodeType: 1,
    children: [],
    appendChild: (c: unknown) => c,
    removeChild: (c: unknown) => c,
    insertBefore: (c: unknown) => c,
    setAttribute: noop,
    getAttribute: () => null,
    removeAttribute: noop,
    addEventListener: noop,
    removeEventListener: noop,
    getContext: () => null,
    focus: noop,
    blur: noop,
    getBoundingClientRect: () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
  };
}

/**
 * Install the headless DOM stubs onto `scope` (default `globalThis`) so a
 * browser-targeted game engine boots with no real DOM. Idempotent; call once
 * before the engine evaluates on the server. Returns the names it installed (for
 * diagnostics / tests).
 *
 * HEADLESS ONLY: never call in a real browser; it would shadow the live DOM.
 * Provides existence + deterministic defaults for `window` / `self` / `document`
 * / `navigator` / `screen` / a `<canvas>` (+ no-op 2D/GL context) / `Image` /
 * `OffscreenCanvas` / `Path2D` / `performance` / `location` / `matchMedia` /
 * `devicePixelRatio`, bare `addEventListener` / `removeEventListener`, and a
 * `requestAnimationFrame` that never fires. Does NOT freeze the wall clock;
 * pair with {@link freezeClock} on the server.
 */
export function applyHeadlessDom(scope: object = globalThis): string[] {
  const g = scope as unknown as Record<string, unknown>;
  const doc: Stub = {
    createElement: (tag: string) => makeElement(tag),
    createElementNS: (_ns: string, tag: string) => makeElement(tag),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: noop,
    removeEventListener: noop,
    documentElement: makeElement('html'),
    body: makeElement('body'),
    head: makeElement('head'),
    readyState: 'complete',
    visibilityState: 'visible',
    hidden: false,
  };
  const nav: Stub = {
    userAgent: 'caputchin-replay',
    language: 'en',
    languages: ['en'],
    hardwareConcurrency: 1,
    platform: 'caputchin',
    maxTouchPoints: 0,
    vendor: '',
  };
  const perf: Stub = { now: () => 0 };
  const screenStub: Stub = {
    width: VIEWPORT_W,
    height: VIEWPORT_H,
    availWidth: VIEWPORT_W,
    availHeight: VIEWPORT_H,
    orientation: { type: 'landscape-primary', angle: 0, addEventListener: noop, removeEventListener: noop },
  };
  const win: Stub = {
    innerWidth: VIEWPORT_W,
    innerHeight: VIEWPORT_H,
    devicePixelRatio: 1,
    document: doc,
    navigator: nav,
    addEventListener: noop,
    removeEventListener: noop,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: noop,
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
    focus: noop,
    blur: noop,
    location: { href: 'http://localhost/', protocol: 'http:' },
    performance: perf,
    screen: screenStub,
  };
  win.window = win;
  win.self = win;
  win.top = win;
  win.parent = win;
  doc.defaultView = win;

  const installed: string[] = [];
  const set = (name: string, value: unknown): void => {
    try {
      Object.defineProperty(g, name, { value, configurable: true, writable: true });
    } catch {
      try {
        g[name] = value;
      } catch {
        return; // non-configurable host global; best effort
      }
    }
    installed.push(name);
  };

  set('window', win);
  set('self', win);
  set('document', doc);
  set('navigator', nav);
  set('requestAnimationFrame', win.requestAnimationFrame);
  set('cancelAnimationFrame', noop);
  // Bare-global event listeners: engines reach for `addEventListener(...)` /
  // `globalThis.addEventListener` directly, not only `window.addEventListener`,
  // the same way they reach for `requestAnimationFrame` bare.
  set('addEventListener', noop);
  set('removeEventListener', noop);
  set('matchMedia', win.matchMedia);
  set('devicePixelRatio', 1);
  set('location', win.location);
  set('screen', screenStub);
  set('performance', perf);
  set('Image', ImageStub);
  set('OffscreenCanvas', class { constructor() { return makeCanvas(); } });
  set('HTMLCanvasElement', class {});
  set('HTMLImageElement', class {});
  set('HTMLVideoElement', class {});
  set('CanvasRenderingContext2D', class {});
  // Path2D pairs with CanvasRenderingContext2D: an engine's `roundRect` polyfill
  // patches `Path2D.prototype` too, so providing the context class but not Path2D
  // makes that polyfill throw if this runs before the engine imports.
  set('Path2D', class {});
  set('WebGLRenderingContext', class {});
  set('WebGL2RenderingContext', class {});

  return installed;
}

const ISO_EPOCH = '1970-01-01T00:00:00.000Z';

/**
 * Freeze the wall clock on `scope` to a fixed value so the headless replay reads
 * no real time: `Date.now()` and (if present) `performance.now()` return `nowMs`,
 * and `new Date()` yields a frozen instance. HEADLESS ONLY: live play must keep
 * the real clock for rendering/audio, so it never calls this.
 *
 * The frozen `Date` is fully SELF-CONTAINED: it never reads the existing `Date`.
 * That matters because the deterministic-replay self-check installs a probe that
 * throws on ANY access to the real `Date`; a wrapper that copied `Date.prototype`
 * / `Date.UTC` would trip it. A deterministic run must not parse real-world dates
 * anyway, so constructor args are ignored (the instance reads as the fixed epoch).
 * A wrong clock is a determinism hazard, so this is its own explicit step rather
 * than bundled into the DOM stubs.
 */
export function freezeClock(scope: object = globalThis, nowMs = 0): void {
  const g = scope as unknown as Record<string, unknown>;
  const proto: Stub = {
    getTime: () => nowMs,
    valueOf: () => nowMs,
    getTimezoneOffset: () => 0,
    toISOString: () => ISO_EPOCH,
    toJSON: () => ISO_EPOCH,
    toString: () => ISO_EPOCH,
    toDateString: () => ISO_EPOCH,
    toLocaleString: () => ISO_EPOCH,
    getFullYear: () => 1970,
    getMonth: () => 0,
    getDate: () => 1,
    getDay: () => 4,
    getHours: () => 0,
    getMinutes: () => 0,
    getSeconds: () => 0,
    getMilliseconds: () => 0,
  };
  function FrozenDate(this: Stub): unknown {
    if (!(this instanceof (FrozenDate as unknown as new () => object))) {
      return ISO_EPOCH; // `Date()` called without `new`
    }
    return undefined;
  }
  const f = FrozenDate as unknown as Record<string, unknown>;
  f.prototype = proto;
  (proto as { constructor?: unknown }).constructor = FrozenDate;
  f.now = () => nowMs;
  f.UTC = () => nowMs;
  f.parse = () => nowMs;
  try {
    Object.defineProperty(g, 'Date', { value: FrozenDate, configurable: true, writable: true });
  } catch {
    g['Date'] = FrozenDate;
  }
  const perf = g['performance'] as { now?: () => number } | undefined;
  if (perf && typeof perf.now === 'function') perf.now = () => nowMs;
}

/**
 * Seal the deterministic clock + scheduler so a FRAMEWORK engine that reads them
 * at RUN-TIME survives the replay self-check's (and the real replay isolate's)
 * ambient ban. Call AFTER {@link applyHeadlessDom} + {@link freezeClock}; this is
 * server / replay side only (the live browser keeps the real clock + scheduler).
 *
 * Why the stubs are not enough on their own: a framework engine boots its game
 * loop lazily, inside `run()` (per round), and that loop reads `Date` /
 * `performance.now()` / `requestAnimationFrame` / `setTimeout` as it constructs -
 * INSIDE the self-check's run-time ban window, unlike a value read once at module
 * eval (e.g. `navigator`, cached before the ban). The ban replaces a banned global
 * via `Object.defineProperty(..., { configurable: true })` in a try/catch, so it
 * shadows the CONFIGURABLE stubs {@link applyHeadlessDom} / {@link freezeClock}
 * install and the loop throws. Re-installing them NON-CONFIGURABLE makes that
 * reconfigure throw and be skipped (the ban's documented carve-out for a host
 * global it cannot patch), so the loop keeps reading the deterministic stub.
 *
 * The sealed bindings stay WRITABLE: the ban defeats itself on `configurable:
 * false` alone (it cannot turn a non-configurable property configurable), so a
 * host test runner that REASSIGNS a global by plain assignment (e.g. vitest
 * swapping `setTimeout` around a test) keeps working - only the ban's reconfigure
 * is blocked, not assignment.
 *
 * The preset never uses the engine's own loop (it drives the fixed-step update
 * directly), so the timer stubs are no-ops that never fire - the loop stays
 * dormant. The clock objects keep a WRITABLE `.now` (`Date.now` / `performance.now`
 * are properties of the sealed objects, not the sealed global binding), so
 * {@link withDeterministicEnv} still overrides them per step.
 */
export function sealHeadlessAmbient(scope: object = globalThis): void {
  const g = scope as Record<string, unknown>;
  const noop = (): void => {};
  const handle = (): number => 0; // a fake timer / frame handle; the callback never fires
  // Read the deterministic value applyHeadlessDom / freezeClock already installed
  // where present; supply a dormant no-op where they did not (setTimeout /
  // setInterval are not part of the DOM stub set).
  const sealed: Record<string, unknown> = {
    Date: g['Date'],
    performance: g['performance'] ?? { now: () => 0 },
    requestAnimationFrame: g['requestAnimationFrame'] ?? handle,
    cancelAnimationFrame: g['cancelAnimationFrame'] ?? noop,
    setTimeout: handle,
    clearTimeout: noop,
    setInterval: handle,
    clearInterval: noop,
  };
  for (const name of Object.keys(sealed)) {
    const value = sealed[name];
    if (value === undefined) continue; // never seal a name to undefined
    try {
      // configurable:false defeats the ban's reconfigure; writable:true keeps a
      // host test runner's plain reassignment (e.g. vitest swapping setTimeout)
      // working - see the docstring.
      Object.defineProperty(g, name, { value, configurable: false, writable: true });
    } catch {
      /* already non-configurable on this host (e.g. a real browser) - leave it */
    }
  }
}
