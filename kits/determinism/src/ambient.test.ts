import { describe, it, expect } from 'vitest';
import { AMBIENT_SURFACES, BAN_ALL_SURFACES, PROBE_SURFACES, bannedProxy } from './ambient';

describe('ambient registry', () => {
  it('shim bans every surface; prober bans a subset', () => {
    expect(BAN_ALL_SURFACES).toEqual(AMBIENT_SURFACES.map((s) => s.name));
    expect(PROBE_SURFACES.every((s) => s.probe)).toBe(true);
    expect(PROBE_SURFACES.length).toBeLessThan(AMBIENT_SURFACES.length);
  });

  it('excludes WASM-legitimate surfaces from the probe set', () => {
    const probed = new Set(PROBE_SURFACES.map((s) => s.name));
    for (const name of ['WebAssembly', 'Atomics', 'SharedArrayBuffer']) {
      expect(BAN_ALL_SURFACES).toContain(name); // shim still bans them
      expect(probed.has(name)).toBe(false); // prober must not flag a conforming WASM run
    }
  });

  it('probes the core time/random/IO surfaces', () => {
    const probed = new Set(PROBE_SURFACES.map((s) => s.name));
    for (const name of ['Date', 'performance', 'crypto', 'fetch', 'Intl', 'navigator'])
      expect(probed.has(name)).toBe(true);
  });

  it('bannedProxy throws the caller-supplied error on every access shape', () => {
    class Tag extends Error {}
    const p = bannedProxy(() => {
      throw new Tag('x');
    }) as { (): unknown; new (): unknown; foo: unknown };
    expect(() => p()).toThrow(Tag);
    expect(() => new p()).toThrow(Tag);
    expect(() => p.foo).toThrow(Tag);
    expect(typeof p).toBe('function'); // benign feature-detection survives
  });
});
