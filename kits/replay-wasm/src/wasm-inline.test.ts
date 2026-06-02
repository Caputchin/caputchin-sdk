import { describe, it, expect } from 'vitest';
import { gzipSync } from 'fflate';
import { inflateWasm } from './wasm-inline.js';

function gzB64(bytes: Uint8Array): string {
  return Buffer.from(gzipSync(bytes)).toString('base64');
}

describe('inflateWasm', () => {
  it('round-trips gzip+base64 back to the original bytes (native DecompressionStream)', async () => {
    // explicit bytes incl. nulls + high bytes (the interesting cases for gzip+base64)
    const original = Uint8Array.from([72, 105, 0, 1, 2, 254, 255, 128, 32, 13, 10]);
    const out = await inflateWasm(gzB64(original));
    expect(Array.from(out)).toEqual(Array.from(original));
  });

  it('falls back to fflate when DecompressionStream is unavailable', async () => {
    const saved = globalThis.DecompressionStream;
    // @ts-expect-error force the fflate fallback path
    delete globalThis.DecompressionStream;
    try {
      const original = Uint8Array.from([1, 2, 3, 200, 201, 0, 255]);
      const out = await inflateWasm(gzB64(original));
      expect(Array.from(out)).toEqual(Array.from(original));
    } finally {
      globalThis.DecompressionStream = saved;
    }
  });
});
