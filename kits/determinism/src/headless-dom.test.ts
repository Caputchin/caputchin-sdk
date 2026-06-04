import { describe, expect, it } from 'vitest';
import { applyHeadlessDom, freezeClock, sealHeadlessAmbient } from './headless-dom';

// Tests install onto a throwaway scope object, never the real globalThis.
type Scope = Record<string, any>;

describe('applyHeadlessDom', () => {
  it('installs the headless globals and reports their names', () => {
    const scope: Scope = {};
    const installed = applyHeadlessDom(scope);
    for (const name of ['window', 'self', 'document', 'navigator', 'screen', 'Image', 'OffscreenCanvas', 'performance', 'requestAnimationFrame']) {
      expect(installed).toContain(name);
    }
    expect(scope.document).toBeDefined();
    expect(scope.window.innerWidth).toBe(800);
    expect(scope.window.window).toBe(scope.window); // self-referential
    expect(scope.screen.orientation.type).toBe('landscape-primary');
  });

  it('installs bare addEventListener / removeEventListener (engines call them bare)', () => {
    const scope: Scope = {};
    const installed = applyHeadlessDom(scope);
    expect(installed).toContain('addEventListener');
    expect(installed).toContain('removeEventListener');
    expect(() => {
      scope.addEventListener('resize', () => undefined);
      scope.removeEventListener('resize', () => undefined);
    }).not.toThrow();
  });

  it('installs Path2D paired with CanvasRenderingContext2D (roundRect polyfills patch its prototype)', () => {
    const scope: Scope = {};
    applyHeadlessDom(scope);
    expect(typeof scope.Path2D).toBe('function');
    expect(scope.Path2D.prototype).toBeDefined();
    expect(typeof scope.CanvasRenderingContext2D).toBe('function');
    // an engine's polyfill does exactly this; it must not throw
    expect(() => {
      scope.Path2D.prototype.roundRect = () => undefined;
      scope.CanvasRenderingContext2D.prototype.roundRect = () => undefined;
    }).not.toThrow();
  });

  it('creates a canvas with a no-op 2D context', () => {
    const scope: Scope = {};
    applyHeadlessDom(scope);
    const canvas = scope.document.createElement('canvas');
    expect(canvas.width).toBe(800);
    const ctx = canvas.getContext('2d');
    expect(() => {
      ctx.fillRect(0, 0, 10, 10);
      ctx.beginPath();
      ctx.stroke();
      ctx.save();
      ctx.restore();
    }).not.toThrow();
    expect(ctx.measureText('hello').width).toBe(0);
    expect(ctx.canvas).toBe(canvas);
  });

  it('returns zeroed pixels of the requested size from getImageData', () => {
    const scope: Scope = {};
    applyHeadlessDom(scope);
    const ctx = scope.document.createElement('canvas').getContext('webgl2');
    const img = ctx.getImageData(0, 0, 4, 4);
    expect(img.width).toBe(4);
    expect(img.data.length).toBe(4 * 4 * 4);
  });

  it('never fires requestAnimationFrame (deterministic, not wall-clock)', () => {
    const scope: Scope = {};
    applyHeadlessDom(scope);
    let fired = false;
    const handle = scope.requestAnimationFrame(() => { fired = true; });
    expect(typeof handle).toBe('number');
    expect(fired).toBe(false);
  });

  it('Image fires onload on a microtask (so a TextureManager advances)', async () => {
    const scope: Scope = {};
    applyHeadlessDom(scope);
    const img = new scope.Image();
    const loaded = new Promise<boolean>((resolve) => { img.onload = () => resolve(true); });
    img.src = 'anything.png';
    expect(await loaded).toBe(true);
    expect(img.complete).toBe(true);
  });
});

describe('freezeClock', () => {
  it('freezes Date.now and performance.now to a fixed value', () => {
    const scope: Scope = {};
    applyHeadlessDom(scope);
    freezeClock(scope, 0);
    expect(scope.Date.now()).toBe(0);
    expect(scope.performance.now()).toBe(0);
    expect(new scope.Date().getTime()).toBe(0);
  });

  it('honours an explicit nowMs; the frozen Date ignores constructor args', () => {
    const scope: Scope = {};
    applyHeadlessDom(scope);
    freezeClock(scope, 1234);
    expect(scope.Date.now()).toBe(1234);
    expect(scope.performance.now()).toBe(1234);
    // Self-contained + deterministic: args are ignored (a replay never parses
    // real-world dates), so the instance always reads as the frozen time.
    expect(new scope.Date(2000, 0, 1).getTime()).toBe(1234);
  });

  it('does not read the existing (possibly trapped) Date when freezing', () => {
    const scope: Scope = {};
    // A probe that throws on ANY use, like the self-check installs.
    scope.Date = new Proxy(function () {}, { apply: () => { throw new Error('x'); }, construct: () => { throw new Error('x'); }, get: () => { throw new Error('x'); } });
    expect(() => freezeClock(scope, 0)).not.toThrow();
    expect(scope.Date.now()).toBe(0);
  });
});

describe('sealHeadlessAmbient', () => {
  const sealed = (): Scope => {
    const scope: Scope = {};
    applyHeadlessDom(scope);
    freezeClock(scope, 0);
    sealHeadlessAmbient(scope);
    return scope;
  };

  it('locks the clock + scheduler surfaces non-configurable', () => {
    const scope = sealed();
    for (const name of ['Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']) {
      expect(Object.getOwnPropertyDescriptor(scope, name)?.configurable, name).toBe(false);
    }
  });

  it('supplies the scheduler surfaces applyHeadlessDom omits (setTimeout / setInterval)', () => {
    const scope = sealed();
    expect(typeof scope.setTimeout).toBe('function');
    expect(typeof scope.setInterval).toBe('function');
  });

  it('survives a run-time ambient ban: a defineProperty-replace is rejected, the deterministic stub stays', () => {
    const scope = sealed();
    // Mimic the self-check prober / replay isolate replacing a banned global with
    // a thrower via Object.defineProperty wrapped in try/catch.
    const ban = (name: string): void => {
      try {
        Object.defineProperty(scope, name, {
          value: new Proxy(function () {}, { apply: () => { throw new Error('banned'); }, get: () => { throw new Error('banned'); } }),
          configurable: true,
          writable: true,
        });
      } catch {
        /* expected: non-configurable, the ban is skipped */
      }
    };
    ban('performance');
    ban('Date');
    ban('setTimeout');
    expect(scope.performance.now()).toBe(0);
    expect(scope.Date.now()).toBe(0);
    expect(typeof scope.setTimeout(() => undefined)).toBe('number');
  });

  it('timer stubs are dormant (the loop never fires)', () => {
    const scope = sealed();
    let fired = false;
    const handle = scope.setTimeout(() => { fired = true; }, 0);
    expect(typeof handle).toBe('number');
    expect(fired).toBe(false);
  });

  it('stays writable so a host runner can reassign by plain assignment (e.g. vitest swaps setTimeout)', () => {
    const scope = sealed();
    const replacement = (): number => 7;
    expect(() => { scope.setTimeout = replacement; }).not.toThrow();
    expect(scope.setTimeout).toBe(replacement);
    // ...while the ban's reconfigure (Object.defineProperty) is still rejected.
    expect(() => Object.defineProperty(scope, 'setTimeout', { value: () => { throw new Error('x'); }, configurable: true })).toThrow();
  });

  it('keeps the clock .now writable so the per-step trap can override it', () => {
    const scope = sealed();
    // The global binding is sealed, but Date.now / performance.now are properties
    // of the sealed objects and stay writable - withDeterministicEnv sets them.
    scope.performance.now = () => 42;
    scope.Date.now = () => 42;
    expect(scope.performance.now()).toBe(42);
    expect(scope.Date.now()).toBe(42);
  });
});
