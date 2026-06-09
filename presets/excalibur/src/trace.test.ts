import { describe, expect, it } from 'vitest';
import { decodeTrace, encodeTrace, type RecordedEvent } from './trace';

describe('trace codec', () => {
  it('round-trips pointer + action events bucketed by tick', () => {
    const events: RecordedEvent[] = [
      { tick: 0, t: 0, k: 0, x: 100, y: 200 },
      { tick: 0, t: 0, k: 1, x: 110, y: 190 },
      { tick: 1, t: 0, k: 2, x: 120, y: 180 },
      { tick: 2, t: 1, a: 3, press: 1 },
      { tick: 5, t: 1, a: 3, press: 0 },
    ];
    const decoded = decodeTrace(encodeTrace(events));
    expect(decoded).toEqual(events);
  });

  it('rounds coordinates to integers (lossless for an integer world)', () => {
    const decoded = decodeTrace(encodeTrace([{ tick: 0, t: 0, k: 0, x: 10.4, y: 20.6 }]));
    expect(decoded[0]).toEqual({ tick: 0, t: 0, k: 0, x: 10, y: 21 });
  });

  it('decodes the empty string + empty envelope to no events', () => {
    expect(decodeTrace('')).toEqual([]);
    expect(decodeTrace(encodeTrace([]))).toEqual([]);
  });

  it('throws on a malformed blob', () => {
    expect(() => decodeTrace('{not json')).toThrow();
    expect(() => decodeTrace('{"v":1}')).toThrow();
  });

  it('throws on a non-finite / non-numeric field (string coord smuggled past JSON)', () => {
    expect(() => decodeTrace('{"v":1,"e":[[0,0,0,"NaN",5]]}')).toThrow();
    expect(() => decodeTrace('{"v":1,"e":[[0,0,0,10,"abc"]]}')).toThrow();
    expect(() => decodeTrace('{"v":1,"e":[["x",0,0,1,2]]}')).toThrow();
  });
});
