import { describe, it, expect } from 'vitest';
import { applyDomShim } from './dom-shim';

// Tests install onto a throwaway scope object, never the real globalThis.
type Scope = Record<string, any>;

describe('applyDomShim', () => {
  it('installs the headless globals onto a scope', () => {
    const scope: Scope = {};
    const installed = applyDomShim(scope);
    for (const name of ['window', 'document', 'navigator', 'requestAnimationFrame']) {
      expect(installed).toContain(name);
    }
    expect(scope.document).toBeDefined();
    expect(scope.window.innerWidth).toBe(800);
  });

  it('creates a canvas with a no-op 2D context', () => {
    const scope: Scope = {};
    applyDomShim(scope);
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
    applyDomShim(scope);
    const ctx = scope.document.createElement('canvas').getContext('2d');
    const img = ctx.getImageData(0, 0, 4, 4);
    expect(img.width).toBe(4);
    expect(img.data.length).toBe(4 * 4 * 4);
  });

  it('never fires requestAnimationFrame (deterministic, not wall-clock)', () => {
    const scope: Scope = {};
    applyDomShim(scope);
    let fired = false;
    const handle = scope.requestAnimationFrame(() => {
      fired = true;
    });
    expect(typeof handle).toBe('number');
    expect(fired).toBe(false);
  });
});
