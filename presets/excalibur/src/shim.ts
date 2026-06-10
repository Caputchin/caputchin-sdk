// The Excalibur headless DOM shim. Excalibur has no native headless mode: it
// expects `window` / `document` / a `<canvas>` (with CSSOM + a 2D context) / an
// `Image` / `XMLHttpRequest` / `AudioContext` / `ResizeObserver` and drives off a
// clock. This installs deterministic no-op stubs so Excalibur instantiates inside
// a sealed isolate with no real DOM. We put Excalibur on its 2D-canvas graphics
// path (`ex.Flags.useCanvasGraphicsContext()`, called by the pump), so unlike the
// KAPLAY shim no WebGL handle stubs are needed - the 2D context swallows draws.
//
// This shim is Excalibur-specific and intentionally NOT shared with other engines:
// a single union shim cannot serve every engine because they demand conflicting
// behaviour from the same globals (one engine needs `getContext('webgl2')` to hand
// back rich non-null handles, another needs it to return null). Owning the shim
// per-engine is what makes "is this stub correct for Excalibur" provable. The exact
// surface is the one the headless determinism spike proved (boot + deterministic
// step + replay self-check clean).
//
// Determinism: every stub returns fixed values; the no-op contexts swallow all
// draws (rendering paints into the void, cannot reach the sim, cannot reach the
// verdict). HEADLESS ONLY - never apply in a real browser, it would shadow the
// live DOM.

import { makeDeterministic, freezeClock } from '@caputchin/determinism';

type AnyRecord = Record<string, unknown>;

const VIEWPORT_W = 800;
const VIEWPORT_H = 600;
const noop = (): void => undefined;

/** A CSSOM-ish style: setProperty/getPropertyValue + a cssText that echoes
 *  assignments (Excalibur's rgba feature probe sets cssText then reads
 *  backgroundColor), plus arbitrary camelCase property storage. */
function makeStyle(): AnyRecord {
  const store: AnyRecord = {};
  const base: AnyRecord = {
    setProperty(k: string, v: string): void {
      store[String(k)] = String(v);
    },
    getPropertyValue(k: string): string {
      return (store[String(k)] as string) ?? '';
    },
    removeProperty(k: string): string {
      const v = store[String(k)];
      delete store[String(k)];
      return (v as string) ?? '';
    },
  };
  let cssText = '';
  Object.defineProperty(base, 'cssText', {
    get: () => cssText,
    set: (v: string) => {
      cssText = String(v);
      const m = /background-color:\s*([^;]+)/i.exec(cssText);
      if (m) store['background-color'] = m[1]!.trim();
    },
    configurable: true,
  });
  return new Proxy(base, {
    get(t, k) {
      if (k in t) return (t as AnyRecord)[k as string];
      if (typeof k === 'symbol') return undefined;
      if (k === 'backgroundColor') return store['background-color'] ?? '';
      return store[k as string] ?? '';
    },
    set(t, k, v) {
      if (k === 'cssText') {
        (t as AnyRecord).cssText = v;
        return true;
      }
      store[k as string] = v;
      return true;
    },
  });
}

/** A no-op 2D context whose transform-ish getters return benign values. The pump
 *  also disables the engine draw, so this mostly exists so construction succeeds. */
function make2DContext(canvas: object): unknown {
  const store: AnyRecord = { canvas };
  return new Proxy(store, {
    get(t, k) {
      if (k === 'canvas') return canvas;
      if (typeof k === 'symbol') return t[k as unknown as string];
      if (k in t) return t[k as string];
      const key = k as string;
      if (key === 'measureText') return () => ({ width: 0 });
      if (key === 'getImageData' || key === 'createImageData') {
        return (...a: number[]) => {
          const w = Math.max(1, Math.floor(a[a.length - 2] ?? 1));
          const h = Math.max(1, Math.floor(a[a.length - 1] ?? 1));
          return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
        };
      }
      if (key === 'createLinearGradient' || key === 'createRadialGradient' || key === 'createPattern') {
        return () => ({ addColorStop: noop });
      }
      if (key === 'getContextAttributes') return () => ({ alpha: true });
      return noop;
    },
    set(t, k, v) {
      t[k as string] = v;
      return true;
    },
  });
}

function makeCanvas(): AnyRecord {
  const canvas: AnyRecord = {
    width: VIEWPORT_W,
    height: VIEWPORT_H,
    clientWidth: VIEWPORT_W,
    clientHeight: VIEWPORT_H,
    offsetWidth: VIEWPORT_W,
    offsetHeight: VIEWPORT_H,
    nodeType: 1,
    tagName: 'CANVAS',
    style: makeStyle(),
    dataset: {},
    className: '',
  };
  canvas.getContext = (type: string): unknown =>
    typeof type === 'string' && type.startsWith('webgl') ? null : make2DContext(canvas);
  canvas.addEventListener = noop;
  canvas.removeEventListener = noop;
  canvas.setAttribute = noop;
  canvas.getAttribute = (): null => null;
  canvas.removeAttribute = noop;
  canvas.focus = noop;
  canvas.blur = noop;
  canvas.appendChild = (c: unknown): unknown => c;
  canvas.removeChild = (c: unknown): unknown => c;
  canvas.toDataURL = (): string => 'data:image/png;base64,';
  canvas.getBoundingClientRect = (): AnyRecord => ({
    x: 0, y: 0, top: 0, left: 0, right: VIEWPORT_W, bottom: VIEWPORT_H, width: VIEWPORT_W, height: VIEWPORT_H,
  });
  canvas.parentElement = null;
  canvas.parentNode = null;
  return canvas;
}

/** Image stub: resolves onload on a Promise microtask (NOT queueMicrotask, which
 *  the replay self-check probe bans) with a 1x1 stand-in, so an asset loader
 *  awaiting onload advances. Decoded pixels are render-only, never read by the
 *  sim, so a stand-in is deterministic and verdict-neutral. */
class ImageStub {
  width = 1;
  height = 1;
  naturalWidth = 1;
  naturalHeight = 1;
  complete = false;
  crossOrigin: string | null = null;
  decoding = 'auto';
  style: AnyRecord = {};
  // Excalibur's TextureLoader reads `image.dataset.originalSrc` when it builds a
  // texture from a loaded image; without `dataset` that read throws on undefined.
  dataset: AnyRecord = {};
  onload: ((e?: unknown) => void) | null = null;
  onerror: ((e?: unknown) => void) | null = null;
  private _src = '';
  get src(): string {
    return this._src;
  }
  set src(v: string) {
    this._src = v;
    void Promise.resolve().then(() => {
      this.complete = true;
      this.onload?.({ target: this });
    });
  }
  setAttribute(name: string, value: unknown): void {
    (this as AnyRecord)[name] = value;
  }
  getAttribute(name: string): unknown {
    return (this as AnyRecord)[name] ?? null;
  }
  removeAttribute(name: string): void {
    delete (this as AnyRecord)[name];
  }
  addEventListener(type: string, cb: (e?: unknown) => void): void {
    if (type === 'load') this.onload = cb;
    else if (type === 'error') this.onerror = cb;
  }
  removeEventListener(): void {}
  decode(): Promise<void> {
    return Promise.resolve();
  }
}

function makeElement(tag: string): AnyRecord {
  const t = String(tag).toLowerCase();
  if (t === 'canvas') return makeCanvas();
  if (t === 'img') return new ImageStub() as unknown as AnyRecord;
  return {
    tagName: t.toUpperCase(),
    nodeType: 1,
    style: makeStyle(),
    dataset: {},
    className: '',
    children: [] as unknown[],
    innerText: '',
    textContent: '',
    appendChild: (c: unknown) => c,
    removeChild: (c: unknown) => c,
    insertBefore: (c: unknown) => c,
    append: noop,
    remove: noop,
    setAttribute: noop,
    getAttribute: () => null,
    removeAttribute: noop,
    addEventListener: noop,
    removeEventListener: noop,
    getContext: () => null,
    focus: noop,
    blur: noop,
    getBoundingClientRect: () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
    parentElement: null,
    parentNode: null,
  };
}

/**
 * Install the Excalibur headless DOM stubs onto `scope` (default `globalThis`).
 * HEADLESS ONLY. Idempotent enough to call once at module load and again at the
 * start of each `run()` (the replay self-check prober shadows globals per call;
 * re-installing re-asserts the deterministic stubs over the probe).
 */
export function installExcaliburDom(scope: object = globalThis): void {
  const g = scope as AnyRecord;

  const audioParam = (): AnyRecord => ({ value: 0, setValueAtTime: noop, linearRampToValueAtTime: noop, cancelScheduledValues: noop });
  const audioNode = (): AnyRecord => ({ connect: () => audioNode(), disconnect: noop, start: noop, stop: noop, gain: audioParam() });
  class AudioContextStub {
    currentTime = 0;
    sampleRate = 44100;
    state = 'running';
    destination = audioNode();
    createGain = audioNode;
    createBufferSource = audioNode;
    createOscillator = audioNode;
    createDynamicsCompressor = audioNode;
    decodeAudioData = (_d: unknown, ok?: (b: unknown) => void): Promise<unknown> => {
      const b = { duration: 0 };
      if (ok) ok(b);
      return Promise.resolve(b);
    };
    resume = (): Promise<void> => Promise.resolve();
    suspend = (): Promise<void> => Promise.resolve();
    close = (): Promise<void> => Promise.resolve();
  }
  class NoopObserver {
    observe = noop;
    unobserve = noop;
    disconnect = noop;
    takeRecords = (): unknown[] => [];
  }
  class XHRStub {
    responseType = '';
    response: unknown = null;
    status = 0;
    open(): void {}
    send(): void {}
    setRequestHeader(): void {}
    abort(): void {}
    addEventListener(): void {}
    removeEventListener(): void {}
  }

  const doc: AnyRecord = {
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
    visibilityState: 'visible',
    hidden: false,
    fonts: { ready: Promise.resolve(), add: noop, load: () => Promise.resolve([]) },
  };

  // Minimal PointerEvent so Excalibur's native pointer pipeline works headless: the
  // preset injects the recorded trace via `engine.input.pointers.triggerEvent`, which
  // builds a `window.PointerEvent`; `_handle` then reads pageX/pageY/button/pointerId/
  // pointerType off it. pageX/pageY mirror clientX/clientY (no scroll in the isolate).
  class PointerEventStub {
    readonly type: string;
    readonly pointerId: number;
    readonly button: number;
    readonly pointerType = 'mouse';
    readonly clientX: number;
    readonly clientY: number;
    readonly pageX: number;
    readonly pageY: number;
    constructor(type: string, init: AnyRecord = {}) {
      this.type = type;
      this.pointerId = (init.pointerId as number) ?? 0;
      this.button = (init.button as number) ?? 0;
      const cx = (init.clientX as number) ?? 0;
      const cy = (init.clientY as number) ?? 0;
      this.clientX = cx;
      this.clientY = cy;
      this.pageX = cx;
      this.pageY = cy;
    }
    preventDefault(): void {}
    stopPropagation(): void {}
  }

  const screenStub: AnyRecord = {
    width: VIEWPORT_W,
    height: VIEWPORT_H,
    availWidth: VIEWPORT_W,
    availHeight: VIEWPORT_H,
    orientation: { type: 'landscape-primary', angle: 0, addEventListener: noop, removeEventListener: noop },
  };

  class WindowStub {}
  const win = new WindowStub() as AnyRecord;
  Object.assign(win, {
    innerWidth: VIEWPORT_W,
    innerHeight: VIEWPORT_H,
    devicePixelRatio: 1,
    document: doc,
    navigator: {
      userAgent: 'caputchin-replay',
      language: 'en',
      languages: ['en'],
      hardwareConcurrency: 1,
      platform: 'caputchin',
      maxTouchPoints: 0,
      getGamepads: () => [] as unknown[],
      vibrate: noop,
    },
    addEventListener: noop,
    removeEventListener: noop,
    focus: noop,
    blur: noop,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: noop,
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
    getComputedStyle: () => makeStyle(),
    location: { href: 'https://caputchin.invalid/', protocol: 'https:' },
    performance: { now: () => 0 },
    screen: screenStub,
    AudioContext: AudioContextStub,
    webkitAudioContext: AudioContextStub,
    Image: ImageStub,
    PointerEvent: PointerEventStub,
  });
  win.window = win;
  win.self = win;
  win.top = win;
  win.parent = win;
  doc.defaultView = win;

  const set = (name: string, value: unknown): void => {
    try {
      Object.defineProperty(g, name, { value, configurable: true, writable: true });
    } catch {
      try {
        g[name] = value;
      } catch {
        /* non-configurable host global - best effort */
      }
    }
  };

  set('window', win);
  set('self', win);
  set('PointerEvent', PointerEventStub);
  set('document', doc);
  set('navigator', win.navigator);
  set('screen', screenStub);
  set('devicePixelRatio', 1);
  set('requestAnimationFrame', win.requestAnimationFrame);
  set('cancelAnimationFrame', win.cancelAnimationFrame);
  // Excalibur's GarbageCollector schedules on idle; never let it fire (a GC pass
  // mid-replay would be non-deterministic). The pump drives stepping by hand.
  set('requestIdleCallback', () => 0);
  set('cancelIdleCallback', noop);
  set('focus', noop);
  set('blur', noop);
  set('addEventListener', noop);
  set('removeEventListener', noop);
  set('matchMedia', win.matchMedia);
  set('getComputedStyle', win.getComputedStyle);
  set('location', win.location);
  // Install `performance` as a VALUE (a define, never a read): under the replay
  // self-check probe the global `performance` is a tracked getter, so replacing
  // the descriptor here stops freezeClock's later read from registering an
  // ambient-time access (the one violation the headless determinism spike closed).
  set('performance', win.performance);
  set('Image', ImageStub);
  set('Window', WindowStub);
  set('Node', class {});
  set('HTMLElement', class {});
  set('HTMLCanvasElement', class {});
  set('HTMLImageElement', class {});
  set('Path2D', class {});
  set('ResizeObserver', NoopObserver);
  set('IntersectionObserver', NoopObserver);
  set('MutationObserver', NoopObserver);
  set('AudioContext', AudioContextStub);
  set('webkitAudioContext', AudioContextStub);
  set('XMLHttpRequest', XHRStub);
  set('createImageBitmap', () => Promise.resolve({ width: 1, height: 1, close: noop }));
}

/**
 * The full headless boot env for the replay isolate: DOM stubs + deterministic
 * `Math` transcendentals + frozen wall clock. Call once at module load (via
 * `@caputchin/preset-excalibur/install`) AND at the start of every `run()` so the
 * env survives the self-check prober - re-installing re-asserts the deterministic
 * stubs (as plain VALUES, a define never a read) over the prober's per-call
 * access-tracking getters, which is what keeps the engine's `performance.now`
 * clock reads from registering as ambient access. (Sealing the ambient set
 * non-configurable is deliberately NOT done: it is unnecessary here - verified by
 * the replay self-check passing without it - and would turn `setTimeout` into a
 * non-firing no-op that hangs a host test runner.) HEADLESS ONLY.
 */
export function installExcaliburHeadless(scope: object = globalThis): void {
  installExcaliburDom(scope);
  makeDeterministic(scope);
  freezeClock(scope);
}
