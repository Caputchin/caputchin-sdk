// The preset's trace codec. The trace is OPAQUE to the platform (it never parses
// it), so this format is private to the preset: the live driver records
// tick-stamped action events and serializes them here; the headless run decodes
// them to replay. A JSON-string envelope (like the engine-kit kit's default)
// interops with `bridge.pass({ trace })` and the `Uint8Array | string` the
// server hands to `run`.

import { TRACE_V } from './constants';

/** One recorded action edge: a press/release of an action index at a logical tick. */
export interface RecordedEvent {
  /** Logical sim tick the event was applied at (0-based). */
  readonly tick: number;
  /** Action index (position in {@link KaplayGameOptions.actions}). */
  readonly action: number;
  /** True for a press, false for a release. */
  readonly press: boolean;
}

interface TraceEnvelope {
  readonly v: number;
  readonly preset: 'kaplay';
  /** Flat triples [tick, action, press?1:0] for compactness. */
  readonly e: readonly number[];
}

const decoder = new TextDecoder();

/** Serialize recorded events into an opaque trace string. */
export function encodeTrace(events: readonly RecordedEvent[]): string {
  const flat: number[] = [];
  for (const ev of events) {
    flat.push(ev.tick, ev.action, ev.press ? 1 : 0);
  }
  const env: TraceEnvelope = { v: TRACE_V, preset: 'kaplay', e: flat };
  return JSON.stringify(env);
}

/**
 * Decode a trace produced by {@link encodeTrace}. Throws on a malformed or
 * wrong-version blob; the caller ({@link kaplayRun}) turns a throw into a failing
 * verdict so a garbage trace is a failed round, never a crash. Accepts a string
 * or UTF-8 bytes.
 */
export function decodeTrace(trace: Uint8Array | string): RecordedEvent[] {
  const text = typeof trace === 'string' ? trace : decoder.decode(trace);
  const parsed = JSON.parse(text) as unknown;
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('preset-kaplay: malformed trace envelope');
  }
  const env = parsed as Record<string, unknown>;
  if (env.v !== TRACE_V || env.preset !== 'kaplay' || !Array.isArray(env.e)) {
    throw new Error('preset-kaplay: unrecognized trace envelope');
  }
  const e = env.e as number[];
  if (e.length % 3 !== 0) {
    throw new Error('preset-kaplay: truncated trace events');
  }
  const out: RecordedEvent[] = [];
  for (let i = 0; i < e.length; i += 3) {
    const tick = e[i];
    const action = e[i + 1];
    if (!Number.isInteger(tick) || tick < 0 || !Number.isInteger(action) || action < 0) {
      throw new Error('preset-kaplay: malformed trace event');
    }
    out.push({ tick, action, press: e[i + 2] === 1 });
  }
  return out;
}
