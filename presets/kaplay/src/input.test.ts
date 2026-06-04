import { describe, it, expect } from 'vitest';
import { InputState } from './input';

describe('InputState', () => {
  it('tracks press / hold / release edges per tick', () => {
    const s = new InputState();

    s.beginTick();
    s.apply('left', true);
    expect(s.justPressed('left')).toBe(true);
    expect(s.isDown('left')).toBe(true);
    expect(s.justReleased('left')).toBe(false);

    // Next tick: still held, no fresh press edge.
    s.beginTick();
    expect(s.justPressed('left')).toBe(false);
    expect(s.isDown('left')).toBe(true);

    // Release.
    s.beginTick();
    s.apply('left', false);
    expect(s.justReleased('left')).toBe(true);
    expect(s.isDown('left')).toBe(false);
  });

  it('a press then release within one tick lands both edges, ends not-down', () => {
    const s = new InputState();
    s.beginTick();
    s.apply('a', true);
    s.apply('a', false);
    expect(s.justPressed('a')).toBe(true);
    expect(s.justReleased('a')).toBe(true);
    expect(s.isDown('a')).toBe(false);
  });

  it('a re-press while already down does not re-edge', () => {
    const s = new InputState();
    s.beginTick();
    s.apply('a', true);
    s.beginTick();
    s.apply('a', true);
    expect(s.justPressed('a')).toBe(false);
    expect(s.isDown('a')).toBe(true);
  });
});
