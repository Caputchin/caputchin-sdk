import { describe, it, expect } from 'vitest';
import { encodeTrace, decodeTrace } from './trace-codec';
import type { TickInput } from './types';

type A = { kind: string; data?: unknown };

describe('trace codec', () => {
  it('round-trips inputs through a string', () => {
    const inputs: TickInput<A>[] = [
      { tick: 0, action: { kind: 'a' } },
      { tick: 3, action: { kind: 'b', data: { x: 1 } } },
    ];
    expect(decodeTrace<A>(encodeTrace(inputs))).toEqual(inputs);
  });

  it('round-trips through UTF-8 bytes', () => {
    const inputs: TickInput<A>[] = [{ tick: 2, action: { kind: 'z' } }];
    const bytes = new TextEncoder().encode(encodeTrace(inputs));
    expect(decodeTrace<A>(bytes)).toEqual(inputs);
  });

  it('throws on non-JSON', () => {
    expect(() => decodeTrace('not json')).toThrow();
  });

  it('throws on a non-object envelope or missing inputs[]', () => {
    expect(() => decodeTrace('123')).toThrow(/malformed trace envelope/);
    expect(() => decodeTrace('{}')).toThrow(/missing inputs/);
  });

  it('throws on a malformed input entry', () => {
    expect(() => decodeTrace('{"inputs":[{"tick":-1,"action":{}}]}')).toThrow(/tick/);
    expect(() => decodeTrace('{"inputs":[null]}')).toThrow(/malformed trace input/);
  });
});
