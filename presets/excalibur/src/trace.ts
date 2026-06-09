// The opaque trace codec. The trace is the ONLY thing the live driver hands the
// server: a tick-stamped stream of raw input events (pointer down/move/up with
// world coordinates, plus optional named-action press/release). The server feeds
// the SAME events back through the SAME sim, tick for tick, so the replayed
// verdict matches live play. Pointer coordinates are in the game's fixed world
// space (the live driver converts device -> world before recording), so the
// headless replay - which has no canvas and does no conversion - reads them
// directly.

/** Pointer phase: 0 = down, 1 = move, 2 = up. */
export type PointerKind = 0 | 1 | 2;

/** A pointer event at a tick, in world coordinates. */
export interface PointerEvent {
  readonly t: 0;
  readonly k: PointerKind;
  readonly x: number;
  readonly y: number;
}

/** A named-action edge at a tick (the action's index in the game's `actions`). */
export interface ActionEvent {
  readonly t: 1;
  readonly a: number;
  readonly press: 0 | 1;
}

/** One input event the sim applies at a tick. */
export type InputEvent = PointerEvent | ActionEvent;

/** An input event stamped with the tick it landed on. */
export type RecordedEvent = InputEvent & { readonly tick: number };

/** Current wire version. Bump only on an incompatible envelope change. */
export const CODEC_V = 1;

interface Envelope {
  readonly v: number;
  /** Each: [tick, t, a, b, c] where pointer = [tick,0,k,x,y], action = [tick,1,a,press]. */
  readonly e: readonly number[][];
}

/** Encode recorded events to the compact wire string. Coordinates are rounded to
 *  integers (the world is integer-pixel, so this is lossless for a conforming
 *  game and keeps the trace small + the codec bit-identical). */
export function encodeTrace(events: readonly RecordedEvent[]): string {
  const e: number[][] = events.map((ev) =>
    ev.t === 0
      ? [ev.tick, 0, ev.k, Math.round(ev.x), Math.round(ev.y)]
      : [ev.tick, 1, ev.a, ev.press],
  );
  const env: Envelope = { v: CODEC_V, e };
  return JSON.stringify(env);
}

/** Decode the wire trace. Throws on a malformed blob (the run adapter catches it
 *  and returns a failing verdict, never a crash). The empty string / empty
 *  envelope decodes to no events (a valid empty round). */
export function decodeTrace(trace: Uint8Array | string): readonly RecordedEvent[] {
  const text = typeof trace === 'string' ? trace : new TextDecoder().decode(trace);
  if (text === '') return [];
  const env = JSON.parse(text) as Envelope;
  if (!env || typeof env !== 'object' || !Array.isArray(env.e)) {
    throw new Error('excalibur trace: malformed envelope');
  }
  // Coerce every numeric field to a finite number; a non-numeric field (e.g. a
  // string coord smuggled past JSON.parse) is malformed -> throw, so the run
  // adapter returns a failing verdict rather than feeding garbage to the sim.
  const num = (v: unknown): number => {
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error('excalibur trace: non-finite field');
    return n;
  };
  const out: RecordedEvent[] = [];
  for (const row of env.e) {
    if (!Array.isArray(row) || row.length < 4) throw new Error('excalibur trace: malformed row');
    const tick = num(row[0]);
    const t = num(row[1]);
    if (t === 0) {
      out.push({ tick, t: 0, k: (num(row[2]) % 3) as PointerKind, x: num(row[3]), y: num(row[4] ?? 0) });
    } else if (t === 1) {
      out.push({ tick, t: 1, a: num(row[2]), press: (row[3] ? 1 : 0) as 0 | 1 });
    } else {
      throw new Error('excalibur trace: unknown event tag');
    }
  }
  return out;
}
