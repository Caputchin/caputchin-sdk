// Per-tick event sources. The scene installer asks the source for the events to
// apply at each tick. Headless reads them from the decoded trace; live drains
// the events queued since the last tick and RECORDS them stamped with the
// current tick (so the recording captures the exact tick each input landed on,
// which the headless replay reproduces).

import type { RecordedEvent } from './trace';

/** One event to apply at a tick: an action index and its press/release. */
export interface TickEvent {
  readonly action: number;
  readonly press: boolean;
}

export interface EventSource {
  /** Events to apply at `tick`. Live sources record them as a side effect. */
  eventsForTick(tick: number): readonly TickEvent[];
}

/** Replays a decoded trace, bucketed by tick. */
export class TraceSource implements EventSource {
  private readonly byTick = new Map<number, TickEvent[]>();
  /** Highest tick carrying an event (0 if none). */
  readonly lastTick: number;

  constructor(events: readonly RecordedEvent[]) {
    let last = 0;
    for (const ev of events) {
      let bucket = this.byTick.get(ev.tick);
      if (!bucket) {
        bucket = [];
        this.byTick.set(ev.tick, bucket);
      }
      bucket.push({ action: ev.action, press: ev.press });
      if (ev.tick > last) last = ev.tick;
    }
    this.lastTick = last;
  }

  eventsForTick(tick: number): readonly TickEvent[] {
    return this.byTick.get(tick) ?? [];
  }
}

/** Collects live input pushed between ticks and records it tick-stamped. */
export class LiveSource implements EventSource {
  private pending: TickEvent[] = [];
  readonly recorded: RecordedEvent[] = [];

  /** Queue a live input edge (from a key/touch/gamepad handler). */
  push(action: number, press: boolean): void {
    this.pending.push({ action, press });
  }

  eventsForTick(tick: number): readonly TickEvent[] {
    if (this.pending.length === 0) return [];
    const evs = this.pending;
    this.pending = [];
    for (const e of evs) this.recorded.push({ tick, action: e.action, press: e.press });
    return evs;
  }
}
