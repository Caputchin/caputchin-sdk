import { describe, it, expect, vi } from 'vitest';

// Regression guard for the Howler global-alias fix in src/install.ts. melonjs
// bundles Howler, whose UMD footer assigns `HowlerGlobal` onto `global`/`window`
// then reads `HowlerGlobal` BARE at module eval. The replay isolate (workerd, no
// nodejs_compat) has neither, so the bare read throws and the artifact never
// loads. install.ts aliases `global` -> globalThis (only when absent) BEFORE
// melonjs evaluates, so the assignment lands and the bare read resolves. These
// tests run in vitest's node env (no `window`), so deleting `global` reproduces
// the isolate's no-global / no-window condition.

const g = globalThis as unknown as Record<string, unknown>;

describe('preset-melonjs install: headless global alias for bundled Howler', () => {
  it('aliases global -> globalThis when both global and window are absent (the isolate)', async () => {
    const had = Object.prototype.hasOwnProperty.call(globalThis, 'global');
    const prior = g.global;
    delete g.global; // workerd has no `global`; node env already has no `window`
    try {
      vi.resetModules();
      await import('../src/install.js');
      expect(g.global).toBe(globalThis);
    } finally {
      if (had) g.global = prior;
      else delete g.global;
    }
  });

  it('leaves an existing global untouched (Node / live realm)', async () => {
    g.global = globalThis; // present, as in Node
    const before = g.global;
    vi.resetModules();
    await import('../src/install.js');
    expect(g.global).toBe(before);
  });
});
