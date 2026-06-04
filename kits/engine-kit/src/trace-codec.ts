// The kit's DEFAULT trace codec. The trace is opaque to the platform
// - the kit may serialize its recorded inputs however it likes, and an author is
// free to bring their own format. This JSON codec is the batteries-included
// default: the live driver records `TickInput`s and `encodeTrace`s them; `toRun`
// `decodeTrace`s the blob to replay it. It is NOT a wire contract; the platform
// never parses it.

import { CODEC_V } from './constants';
import { SHIM_VERSION } from './version';
import type { TickInput } from './types';

interface TraceEnvelope<A> {
  /** Codec envelope version (CODEC_V). */
  readonly v: number;
  /** engine-kit version the recording ran under. */
  readonly shim: string;
  readonly inputs: readonly TickInput<A>[];
}

const decoder = new TextDecoder();

/** Serialize recorded inputs into an opaque trace string. */
export function encodeTrace<A>(inputs: readonly TickInput<A>[]): string {
  const env: TraceEnvelope<A> = { v: CODEC_V, shim: SHIM_VERSION, inputs };
  return JSON.stringify(env);
}

/**
 * Parse a trace produced by {@link encodeTrace} back into recorded inputs.
 * Throws on a malformed blob - `toRun` catches that and yields a failing verdict
 * (a garbage trace is a failed round, never a crash). Accepts the trace as a
 * string or UTF-8 bytes.
 */
export function decodeTrace<A>(trace: Uint8Array | string): readonly TickInput<A>[] {
  const text = typeof trace === 'string' ? trace : decoder.decode(trace);
  const parsed = JSON.parse(text) as unknown;
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('engine-kit: malformed trace envelope');
  }
  const env = parsed as Record<string, unknown>;
  if (!Array.isArray(env.inputs)) {
    throw new Error('engine-kit: trace envelope missing inputs[]');
  }
  const out: TickInput<A>[] = [];
  for (const raw of env.inputs) {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error('engine-kit: malformed trace input');
    }
    const e = raw as Record<string, unknown>;
    if (!Number.isInteger(e.tick) || (e.tick as number) < 0) {
      throw new Error('engine-kit: malformed trace input tick');
    }
    out.push({ tick: e.tick as number, action: e.action as A });
  }
  return out;
}
