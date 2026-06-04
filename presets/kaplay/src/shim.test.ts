import { describe, it, expect } from 'vitest';
import kaplay from 'kaplay';
import { installKaplayShim } from './shim';

describe('installKaplayShim', () => {
  it('installs headless globals and a success-shaped GL context', () => {
    const shim = installKaplayShim();
    try {
      expect(typeof (globalThis as { navigator?: { getGamepads?: unknown } }).navigator?.getGamepads).toBe('function');
      const canvas = shim.canvas as { getContext(t: string): Record<string, unknown> };
      const gl = canvas.getContext('webgl2');
      // create*() must be non-null handles; compile/link must report success.
      expect((gl.createProgram as () => unknown)()).not.toBeNull();
      expect((gl.getShaderParameter as () => unknown)()).toBe(true);
      expect((gl.getProgramParameter as () => unknown)()).toBe(true);
    } finally {
      shim.uninstall();
    }
  });

  it('captures requestAnimationFrame instead of scheduling it', () => {
    const shim = installKaplayShim();
    try {
      let ran = 0;
      (globalThis.requestAnimationFrame as (cb: (t: number) => void) => number)(() => {
        ran += 1;
      });
      expect(shim.hasPendingFrame()).toBe(true);
      expect(ran).toBe(0); // never fires on its own
      shim.flushFrame(16);
      expect(ran).toBe(1);
    } finally {
      shim.uninstall();
    }
  });

  it('restores the original (read-only Node) navigator on uninstall', () => {
    const before = globalThis.navigator;
    const shim = installKaplayShim();
    shim.uninstall();
    expect(globalThis.navigator).toBe(before);
  });

  it('boots KAPLAY headless without throwing', async () => {
    const shim = installKaplayShim();
    try {
      const k = kaplay({
        canvas: shim.canvas as unknown as HTMLCanvasElement,
        global: false,
        loadingScreen: false,
        width: 64,
        height: 64,
      });
      expect(typeof k.onFixedUpdate).toBe('function');
      // Let the async default-asset load settle so its onload does not fire
      // against an uninstalled global after teardown.
      for (let i = 0; i < 100 && k.loadProgress() < 1; i++) {
        shim.flushFrame(i * 20);
        await new Promise((r) => setTimeout(r, 0));
      }
    } finally {
      shim.uninstall();
    }
  });
});
