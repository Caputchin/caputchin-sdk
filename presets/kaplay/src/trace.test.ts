import { describe, it, expect } from 'vitest';
import { encodeTrace, decodeTrace, type RecordedEvent } from './trace';

const events: RecordedEvent[] = [
  { tick: 0, action: 0, press: true },
  { tick: 3, action: 1, press: true },
  { tick: 3, action: 0, press: false },
  { tick: 200, action: 1, press: false },
];

describe('trace codec', () => {
  it('round-trips events (string and bytes)', () => {
    const s = encodeTrace(events);
    expect(decodeTrace(s)).toEqual(events);
    expect(decodeTrace(new TextEncoder().encode(s))).toEqual(events);
  });

  it('round-trips an empty trace', () => {
    expect(decodeTrace(encodeTrace([]))).toEqual([]);
  });

  it('throws on non-JSON', () => {
    expect(() => decodeTrace('not json')).toThrow();
  });

  it('throws on a wrong envelope', () => {
    expect(() => decodeTrace(JSON.stringify({ v: 1, preset: 'other', e: [] }))).toThrow();
    expect(() => decodeTrace(JSON.stringify({ v: 999, preset: 'kaplay', e: [] }))).toThrow();
    expect(() => decodeTrace(JSON.stringify({ v: 1, preset: 'kaplay', e: [1, 2] }))).toThrow();
  });
});
