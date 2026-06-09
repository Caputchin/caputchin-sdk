// Per-tick input sources. The runtime asks the source for the events to apply at
// each tick. Headless replays a decoded trace bucketed by tick; live drains the
// events queued since the last tick and RECORDS them stamped with the current
// tick, so the recording captures the exact tick each input landed on - which the
// headless replay then reproduces.

import type { InputEvent, PointerKind, RecordedEvent } from './trace';

export interface EventSource {
  /** Events to apply at `tick`. Live sources record them as a side effect. */
  eventsForTick(tick: number): readonly InputEvent[];
}

/** Replays a decoded trace, bucketed by tick. */
export class TraceSource implements EventSource {
  private readonly byTick = new Map<number, InputEvent[]>();
  /** Highest tick carrying an event (0 if none). */
  readonly lastTick: number;

  constructor(events: readonly RecordedEvent[]) {
    let last = 0;
    for (const ev of events) {
      const { tick, ...rest } = ev;
      let bucket = this.byTick.get(tick);
      if (!bucket) {
        bucket = [];
        this.byTick.set(tick, bucket);
      }
      bucket.push(rest as InputEvent);
      if (tick > last) last = tick;
    }
    this.lastTick = last;
  }

  eventsForTick(tick: number): readonly InputEvent[] {
    return this.byTick.get(tick) ?? [];
  }
}

/** Collects live input pushed between ticks and records it tick-stamped. */
export class LiveSource implements EventSource {
  private pending: InputEvent[] = [];
  readonly recorded: RecordedEvent[] = [];

  /** Queue a live pointer edge (world coordinates). */
  pushPointer(k: PointerKind, x: number, y: number): void {
    this.pending.push({ t: 0, k, x, y });
  }

  /** Queue a live named-action edge (action index). */
  pushAction(a: number, press: boolean): void {
    this.pending.push({ t: 1, a, press: press ? 1 : 0 });
  }

  eventsForTick(tick: number): readonly InputEvent[] {
    if (this.pending.length === 0) return [];
    const evs = this.pending;
    this.pending = [];
    for (const e of evs) this.recorded.push({ tick, ...e });
    return evs;
  }
}
