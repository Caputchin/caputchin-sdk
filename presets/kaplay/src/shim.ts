// The KAPLAY headless shim. KAPLAY has no native headless mode: it expects
// `window` / `document` / a `<canvas>` with a live WebGL2 context, and it drives
// itself off `requestAnimationFrame`. This module installs deterministic no-op
// stubs so KAPLAY can instantiate inside a sealed isolate that has no real DOM,
// and a CAPTURING rAF so the loop never self-schedules — the pump (pump.ts)
// advances it one fixed step at a time instead.
//
// This shim is KAPLAY-specific and intentionally NOT shared with other engines:
// a union shim is rejected because engines demand conflicting behavior from the
// same globals (e.g. `getContext('webgl2')` must return a rich stub here but
// `null` elsewhere). Owning it per-engine is what makes "is this stub correct for
// KAPLAY" provable.
//
// Determinism: every stub returns fixed values; no wall clock, no rAF callback
// ever fires on its own, and the no-op GL/2D contexts swallow all draws (the
// renderer paints into the void and cannot touch the sim, so it cannot touch the
// verdict).

import { makeDeterministic, freezeClock } from '@caputchin/determinism';

type AnyRecord = Record<string, unknown>;

const VIEWPORT_W = 800;
const VIEWPORT_H = 600;

const noop = (): void => undefined;

/** Stable numeric value for a GL enum constant access (e.g. `gl.TRIANGLES`). */
function enumValue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return h >>> 0 || 1;
}

/**
 * A no-op WebGL/WebGL2 context. Methods that KAPLAY's renderer init branches on
 * must return success-shaped values (a non-null handle, `true` for
 * compile/link), or boot throws; everything else is a swallowing no-op.
 */
function makeGL(canvas: object): unknown {
  const store: AnyRecord = {};
  // Each create*() must return a DISTINCT non-null handle.
  const handle = (): object => ({});
  const overrides: Record<string, (...a: unknown[]) => unknown> = {
    getContextAttributes: () => ({ alpha: true, antialias: false, depth: true, stencil: true }),
    getExtension: () => null,
    getSupportedExtensions: () => [],
    getParameter: () => 0,
    getShaderPrecisionFormat: () => ({ precision: 23, rangeMin: 127, rangeMax: 127 }),
    // Resource creation -> opaque non-null handles.
    createBuffer: handle,
    createTexture: handle,
    createFramebuffer: handle,
    createRenderbuffer: handle,
    createProgram: handle,
    createShader: handle,
    createVertexArray: handle,
    createSampler: handle,
    fenceSync: handle,
    // Compile/link status -> success.
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    getShaderInfoLog: () => '',
    getProgramInfoLog: () => '',
    checkFramebufferStatus: () => enumValue('FRAMEBUFFER_COMPLETE'),
    // Locations.
    getUniformLocation: handle,
    getAttribLocation: () => 0,
    getUniformBlockIndex: () => 0,
  };
  return new Proxy(store, {
    get(target, key) {
      if (key === 'canvas') return canvas;
      if (typeof key === 'symbol') return target[key as unknown as string];
      const k = key as string;
      if (k in overrides) return overrides[k];
      if (k in target) return target[k];
      // ALL_CAPS / digits => a GL enum constant (numeric).
      if (/^[A-Z0-9_]+$/.test(k)) return enumValue(k);
      // Anything else is a chainable no-op method.
      return noop;
    },
    set(target, key, value) {
      target[key as string] = value;
      return true;
    },
  });
}

/** A no-op 2D context (KAPLAY rasterizes glyphs/sprites into a 2D canvas). */
function make2D(canvas: object): unknown {
  const store: AnyRecord = { canvas };
  return new Proxy(store, {
    get(target, key) {
      if (typeof key === 'symbol') return target[key as unknown as string];
      const k = key as string;
      if (k === 'canvas') return canvas;
      if (k === 'measureText') return () => ({ width: 0 });
      if (k === 'getImageData' || k === 'createImageData') {
        return (...a: number[]) => {
          const w = Math.max(0, Math.floor(a[a.length - 2] ?? 1));
          const h = Math.max(0, Math.floor(a[a.length - 1] ?? 1));
          return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
        };
      }
      if (k in target) return target[k];
      return noop;
    },
    set(target, key, value) {
      target[key as string] = value;
      return true;
    },
  });
}

function makeCanvas(): AnyRecord {
  const canvas: AnyRecord = { width: VIEWPORT_W, height: VIEWPORT_H, style: {}, className: '', dataset: {} };
  canvas.getContext = (type: string) =>
    typeof type === 'string' && type.startsWith('webgl') ? makeGL(canvas) : make2D(canvas);
  canvas.addEventListener = noop;
  canvas.removeEventListener = noop;
  canvas.setAttribute = noop;
  canvas.getAttribute = () => null;
  canvas.focus = noop;
  canvas.toDataURL = () => 'data:,';
  canvas.getBoundingClientRect = () => ({
    x: 0, y: 0, top: 0, left: 0, right: VIEWPORT_W, bottom: VIEWPORT_H, width: VIEWPORT_W, height: VIEWPORT_H,
  });
  canvas.parentElement = null;
  return canvas;
}

function makeElement(tag: string): AnyRecord {
  if (tag.toLowerCase() === 'canvas') return makeCanvas();
  const el: AnyRecord = {
    tagName: tag.toUpperCase(),
    style: {},
    dataset: {},
    className: '',
    children: [] as unknown[],
    appendChild: (c: unknown) => c,
    removeChild: (c: unknown) => c,
    append: noop,
    remove: noop,
    setAttribute: noop,
    getAttribute: () => null,
    addEventListener: noop,
    removeEventListener: noop,
    getContext: () => null,
    focus: noop,
    getBoundingClientRect: () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
  };
  return el;
}

/** A handle to an installed shim: the canvas KAPLAY draws into, plus loop control. */
export interface KaplayShim {
  /** The fake canvas to pass as `kaplay({ canvas })` (an opaque stub; cast to `HTMLCanvasElement` at the call site). */
  readonly canvas: object;
  /** Run the latest pending rAF callback with timestamp `tMs` (ms). No-op if none pending. */
  flushFrame(tMs: number): void;
  /** Whether a frame callback is currently armed. */
  hasPendingFrame(): boolean;
  /** Restore the globals this shim replaced. */
  uninstall(): void;
}

/**
 * Install the KAPLAY headless globals onto `scope` (default `globalThis`) and
 * return a {@link KaplayShim}. `requestAnimationFrame` is CAPTURING: it stores
 * the callback instead of scheduling it, so KAPLAY's loop only advances when
 * {@link KaplayShim.flushFrame} is called. Also makes `Math` transcendentals
 * deterministic (the kit's `makeDeterministic`) and freezes the wall clock (the
 * kit's `freezeClock`) so the headless replay is bit-identical to live play and
 * independent of when it runs. {@link KaplayShim.uninstall} fully restores all of
 * it. Idempotent per scope is NOT guaranteed — install once, uninstall when done.
 */
export function installKaplayShim(scope: object = globalThis): KaplayShim {
  const g = scope as AnyRecord;
  const canvas = makeCanvas();

  let pending: ((t: number) => void) | null = null;

  const doc: AnyRecord = {
    createElement: (tag: string) => makeElement(tag),
    createElementNS: (_ns: string, tag: string) => makeElement(tag),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [] as unknown[],
    addEventListener: noop,
    removeEventListener: noop,
    readyState: 'complete',
    visibilityState: 'visible',
    hidden: false,
    fonts: { ready: Promise.resolve(), add: noop, load: () => Promise.resolve([]) },
  };
  doc.documentElement = makeElement('html');
  doc.body = makeElement('body');
  doc.head = makeElement('head');

  // No-op Web Audio. KAPLAY builds a master gain at init and audio nodes per
  // sound; headless they connect into the void. Audio is never in the verdict.
  const audioParam = (): AnyRecord => ({ value: 0, setValueAtTime: noop, linearRampToValueAtTime: noop, cancelScheduledValues: noop });
  const audioNode = (): AnyRecord => ({ connect: () => audioNode(), disconnect: noop, start: noop, stop: noop, gain: audioParam(), pan: audioParam(), playbackRate: audioParam(), detune: audioParam(), onended: null, buffer: null, loop: false });
  const audioBuffer = (): AnyRecord => ({ duration: 0, length: 0, sampleRate: 44100, numberOfChannels: 2, getChannelData: () => new Float32Array(0) });
  class AudioContextStub {
    currentTime = 0;
    sampleRate = 44100;
    state = 'running';
    destination = audioNode();
    listener = {};
    createGain = audioNode;
    createBufferSource = audioNode;
    createPanner = audioNode;
    createStereoPanner = audioNode;
    createAnalyser = audioNode;
    createBuffer = audioBuffer;
    createOscillator = audioNode;
    decodeAudioData = (_data: unknown, success?: (b: unknown) => void) => {
      const b = audioBuffer();
      if (success) success(b);
      return Promise.resolve(b);
    };
    resume = (): Promise<void> => Promise.resolve();
    suspend = (): Promise<void> => Promise.resolve();
    close = (): Promise<void> => Promise.resolve();
  }

  const win: AnyRecord = {
    innerWidth: VIEWPORT_W,
    innerHeight: VIEWPORT_H,
    devicePixelRatio: 1,
    document: doc,
    navigator: {
      userAgent: 'caputchin-replay',
      language: 'en',
      hardwareConcurrency: 1,
      platform: 'caputchin',
      maxTouchPoints: 0,
      getGamepads: () => [] as unknown[],
      vibrate: noop,
    },
    addEventListener: noop,
    removeEventListener: noop,
    requestAnimationFrame: (cb: (t: number) => void) => {
      pending = cb;
      return 1;
    },
    cancelAnimationFrame: () => {
      pending = null;
    },
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    location: { href: 'https://caputchin.invalid/', protocol: 'https:' },
    AudioContext: AudioContextStub,
    webkitAudioContext: AudioContextStub,
  };

  // No-op observers KAPLAY constructs against the canvas / viewport.
  class NoopObserver {
    observe = noop;
    unobserve = noop;
    disconnect = noop;
    takeRecords = (): unknown[] => [];
  }

  // KAPLAY loads default assets (the `bean` sprite, the default bitmap font)
  // through `new Image()` + data URIs. Headless we cannot decode pixels, but the
  // asset promise must RESOLVE or KAPLAY stays in its loading state and never
  // runs user onFixedUpdate. So onload fires on a microtask with a 1x1 stand-in;
  // the decoded pixels are never read by the sim (render-only).
  class ImageStub {
    width = 1;
    height = 1;
    naturalWidth = 1;
    naturalHeight = 1;
    complete = false;
    crossOrigin: string | null = null;
    decoding = 'auto';
    onload: ((e?: unknown) => void) | null = null;
    onerror: ((e?: unknown) => void) | null = null;
    private _src = '';
    get src(): string {
      return this._src;
    }
    set src(v: string) {
      this._src = v;
      queueMicrotask(() => {
        this.complete = true;
        this.onload?.();
      });
    }
    addEventListener(type: string, cb: (e?: unknown) => void): void {
      if (type === 'load') this.onload = cb;
      else if (type === 'error') this.onerror = cb;
    }
    removeEventListener = noop;
    decode = (): Promise<void> => Promise.resolve();
  }

  // KAPLAY builds default textures via `new ImageData(...)`. Mirror both
  // constructor signatures: (w, h) and (Uint8ClampedArray, w, h?).
  class ImageDataStub {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(a: Uint8ClampedArray | number, b: number, c?: number) {
      if (a instanceof Uint8ClampedArray) {
        this.data = a;
        this.width = b;
        this.height = c ?? Math.floor(a.length / 4 / Math.max(1, b));
      } else {
        this.width = a;
        this.height = b;
        this.data = new Uint8ClampedArray(Math.max(0, a) * Math.max(0, b) * 4);
      }
    }
  }

  // Record prior descriptors so uninstall restores exactly. NOTE: Node >=21
  // ships read-only globals (`navigator`, `performance`), so a bare assignment
  // silently fails and KAPLAY would see Node's stub (no `getGamepads` etc.).
  // Install via defineProperty(configurable, writable) to override them.
  const names = ['window', 'self', 'document', 'navigator', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'getComputedStyle', 'devicePixelRatio', 'ResizeObserver', 'IntersectionObserver', 'ImageData', 'AudioContext', 'webkitAudioContext', 'Image', 'createImageBitmap'];
  const priorDesc: Record<string, PropertyDescriptor | undefined> = {};
  for (const n of names) priorDesc[n] = Object.getOwnPropertyDescriptor(g, n);

  const set = (name: string, value: unknown): void => {
    try {
      Object.defineProperty(g, name, { value, configurable: true, writable: true });
    } catch {
      try {
        g[name] = value;
      } catch {
        // non-configurable + non-writable on this host - best effort
      }
    }
  };
  set('window', win);
  set('self', win);
  set('document', doc);
  set('navigator', win.navigator);
  set('requestAnimationFrame', win.requestAnimationFrame);
  set('cancelAnimationFrame', win.cancelAnimationFrame);
  set('matchMedia', win.matchMedia);
  set('getComputedStyle', win.getComputedStyle);
  set('devicePixelRatio', 1);
  set('ResizeObserver', NoopObserver);
  set('IntersectionObserver', NoopObserver);
  set('ImageData', ImageDataStub);
  set('AudioContext', AudioContextStub);
  set('webkitAudioContext', AudioContextStub);
  set('Image', ImageStub);
  set('createImageBitmap', () => Promise.resolve({ width: 1, height: 1, close: noop }));

  // Make the scope's Math transcendentals deterministic so KAPLAY's own physics
  // computes bit-identically here and in the browser. Snapshot the originals so
  // uninstall fully restores Math (the replay isolate is per-run, but tests share
  // a process, so the swap must not leak).
  const mathScope = (g['Math'] as AnyRecord) ?? (Math as unknown as AnyRecord);
  const mathSnapshot: AnyRecord = {};
  for (const n of Object.getOwnPropertyNames(mathScope)) mathSnapshot[n] = mathScope[n];
  makeDeterministic(g);

  // Freeze the wall clock (the kit's `freezeClock`) HEADLESS only, so the server
  // replay's verdict is independent of WHEN it runs - the platform re-runs the
  // same replay (self-check / retry / verify) and `Date` / `performance.now` must
  // read identically each time. Live play never freezes (it keeps the real clock
  // for rendering/audio); a conforming game reads neither in the sim (it runs on
  // virtual rAF time), so this changes nothing observable and only makes a stray
  // wall-clock read fail closed. Snapshot to restore - tests share a process.
  const priorDate = Object.getOwnPropertyDescriptor(g, 'Date');
  const perfObj = g['performance'] as { now?: () => number } | undefined;
  const priorPerfNow = perfObj?.now;
  freezeClock(g, 0);

  return {
    canvas,
    flushFrame(tMs: number): void {
      const cb = pending;
      pending = null;
      if (cb) cb(tMs);
    },
    hasPendingFrame: () => pending !== null,
    uninstall(): void {
      for (const n of names) {
        try {
          const d = priorDesc[n];
          if (d) Object.defineProperty(g, n, d);
          else delete g[n];
        } catch {
          /* best effort */
        }
      }
      for (const n of Object.keys(mathSnapshot)) {
        try {
          mathScope[n] = mathSnapshot[n];
        } catch {
          /* best effort */
        }
      }
      try {
        if (priorDate) Object.defineProperty(g, 'Date', priorDate);
      } catch {
        /* best effort */
      }
      if (perfObj && priorPerfNow) {
        try {
          perfObj.now = priorPerfNow;
        } catch {
          /* best effort */
        }
      }
    },
  };
}
