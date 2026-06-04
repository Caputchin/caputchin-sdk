import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { deriveSeed, SEED_BYTES, SEED_WORDS, type Seed } from './seed';

// Independent reference: Node's createHash, a different SHA-256 implementation
// than Web Crypto's subtle.digest. Agreement pins both the hash and the exact
// byte layout deriveSeed commits to (low 128 bits, big-endian words, MSW first).
function referenceSeed(sessionId: string, gameId: string, roundIndex: number): Seed {
  const h = createHash('sha256').update(`${sessionId}:${gameId}:${roundIndex}`).digest();
  return [h.readUInt32BE(16), h.readUInt32BE(20), h.readUInt32BE(24), h.readUInt32BE(28)];
}

describe('deriveSeed', () => {
  const S = 'sess_abc123';
  const G = 'acme/games/sample';

  it('is deterministic - same inputs, same seed', async () => {
    const a = await deriveSeed(S, G, 0);
    const b = await deriveSeed(S, G, 0);
    expect(a).toEqual(b);
  });

  it('matches an independent SHA-256 + byte layout', async () => {
    for (const r of [0, 1, 7, 42, 1000]) {
      expect(await deriveSeed(S, G, r)).toEqual(referenceSeed(S, G, r));
    }
  });

  it('changes with roundIndex', async () => {
    expect(await deriveSeed(S, G, 0)).not.toEqual(await deriveSeed(S, G, 1));
  });

  it('changes with gameId', async () => {
    expect(await deriveSeed(S, G, 0)).not.toEqual(
      await deriveSeed(S, 'acme/games/other', 0),
    );
  });

  it('changes with sessionId', async () => {
    expect(await deriveSeed(S, G, 0)).not.toEqual(await deriveSeed('sess_other', G, 0));
  });

  it('emits SEED_WORDS unsigned 32-bit words', async () => {
    const seed = await deriveSeed(S, G, 3);
    expect(seed).toHaveLength(SEED_WORDS);
    for (const w of seed) {
      expect(Number.isInteger(w)).toBe(true);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(0xffffffff);
    }
    expect(SEED_BYTES).toBe(SEED_WORDS * 4);
  });

  it('rejects an empty sessionId or gameId', async () => {
    await expect(deriveSeed('', G, 0)).rejects.toThrow(/non-empty/);
    await expect(deriveSeed(S, '', 0)).rejects.toThrow(/non-empty/);
  });

  it("rejects a field containing the ':' separator", async () => {
    await expect(deriveSeed('a:b', G, 0)).rejects.toThrow(/must not contain/);
    await expect(deriveSeed(S, 'a:b', 0)).rejects.toThrow(/must not contain/);
  });

  it('rejects a non-integer or negative roundIndex', async () => {
    await expect(deriveSeed(S, G, -1)).rejects.toThrow(/non-negative integer/);
    await expect(deriveSeed(S, G, 1.5)).rejects.toThrow(/non-negative integer/);
  });

  it('does not collide across the separator boundary', async () => {
    // Guarded inputs make "a:b","c" vs "a","b:c" impossible to submit, but the
    // distinct numeric round boundary must still separate cleanly.
    expect(await deriveSeed('a', 'b', 10)).not.toEqual(await deriveSeed('a', 'b', 1));
  });
});
