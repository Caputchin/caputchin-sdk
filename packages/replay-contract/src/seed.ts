// The per-round replay seed and its canonical derivation.

/**
 * The replay seed: the low 128 bits of `SHA-256(sessionId : gameId : roundIndex)`,
 * carried as four unsigned 32-bit words, most-significant word first.
 *
 * Fixed 128-bit width so it slices cleanly into a 128-bit PRNG state. The server
 * derives it both when issuing at `/verify/start` and again when replaying, so
 * it never rides the wire as trusted client input. The seed BINDS a trace to one
 * session + game + round: replaying a foreign or earlier trace under a different
 * seed yields `passed:false`, which is how trace injection is defended.
 */
export type Seed = readonly [number, number, number, number];

/** Number of 32-bit words in a {@link Seed} (128 bits / 32). */
export const SEED_WORDS = 4;

/** Byte length of a {@link Seed} (128 bits). */
export const SEED_BYTES = 16;

const FIELD_SEPARATOR = ':';

const encoder = new TextEncoder();

function assertField(name: string, value: string): void {
  if (value.length === 0) {
    throw new Error(`deriveSeed: ${name} must be a non-empty string`);
  }
  if (value.includes(FIELD_SEPARATOR)) {
    // The preimage joins fields with ':'. A ':' inside a field would let two
    // distinct (sessionId, gameId) pairs collide on the same preimage, so a
    // trace recorded for one game could pass for another. sessionId is a server
    // token and gameId is a slug, so neither contains ':'; fail loud if that
    // invariant is ever violated rather than mint a colliding seed.
    throw new Error(`deriveSeed: ${name} must not contain '${FIELD_SEPARATOR}'`);
  }
}

/**
 * Derive the per-round seed from the session, game, and round index.
 *
 * Preimage: `${sessionId}:${gameId}:${roundIndex}` (UTF-8). Hash: SHA-256 via
 * Web Crypto (async - there is no sync SHA-256 in the platform, and rolling our
 * own would be an audit surface). The seed is the LOW 128 bits of the digest
 * (its last 16 bytes, the digest being big-endian with byte 0 most significant),
 * packed big-endian into four u32 words, most-significant word first.
 *
 * This packing is the canonical wire form. The server re-derives it bit-for-bit
 * at replay, so any drift here silently breaks every replay; the test pins it
 * against an independent SHA-256.
 *
 * @param sessionId - Server-issued session token. Must be non-empty and must
 *   not contain `':'`.
 * @param gameId - Game identifier slug (e.g. `"dino-runner"`). Must be
 *   non-empty and must not contain `':'`.
 * @param roundIndex - Zero-based round counter for this session. Must be a
 *   non-negative integer.
 */
export async function deriveSeed(
  sessionId: string,
  gameId: string,
  roundIndex: number,
): Promise<Seed> {
  if (!Number.isInteger(roundIndex) || roundIndex < 0) {
    throw new Error('deriveSeed: roundIndex must be a non-negative integer');
  }
  assertField('sessionId', sessionId);
  assertField('gameId', gameId);

  const preimage = `${sessionId}${FIELD_SEPARATOR}${gameId}${FIELD_SEPARATOR}${roundIndex}`;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(preimage));
  const view = new DataView(digest);
  // Last SEED_BYTES bytes of the digest, read as big-endian u32 words.
  const offset = view.byteLength - SEED_BYTES;
  return [
    view.getUint32(offset, false),
    view.getUint32(offset + 4, false),
    view.getUint32(offset + 8, false),
    view.getUint32(offset + 12, false),
  ];
}
