import { describe, it, expect } from 'vitest';
import { defineEngine } from './define-engine';
import { project } from './project';
import { replay } from './harness';
import type { Seed } from './types';

interface S {
  rngState: readonly number[];
  tick: number;
  score: number;
}
const SEED: Seed = [1, 2, 3, 4];

const withoutView = defineEngine<S, { kind: string }, unknown>({
  init: () => ({ rngState: [9, 9, 9, 9], tick: 0, score: 0 }),
  step: (s) => s,
  tick: (s) => ({ ...s, tick: s.tick + 1, score: s.score + 1 }),
  isOver: (s) => s.tick >= 3,
  result: (s) => ({ score: s.score }),
});

const withView = defineEngine<S, { kind: string }, unknown, { score: number }>({
  ...withoutView,
  view: (s) => ({ score: s.score }), // hide rngState + tick from the renderer
});

describe('project (optional view)', () => {
  it('returns the FULL state when no view is defined', () => {
    const s: S = { rngState: [9, 9, 9, 9], tick: 5, score: 42 };
    expect(project(withoutView, s)).toBe(s);
    expect(project(withoutView, s)).toHaveProperty('rngState');
  });

  it('returns ONLY the projection when view is defined', () => {
    const s: S = { rngState: [9, 9, 9, 9], tick: 5, score: 42 };
    const v = project(withView, s);
    expect(v).toEqual({ score: 42 });
    expect(v).not.toHaveProperty('rngState');
    expect(v).not.toHaveProperty('tick');
  });

  it('view never affects replay — same outcome with or without it', () => {
    const input = { seed: SEED, config: {}, actions: [], maxTicks: 100 };
    expect(replay(withView, input)).toEqual(replay(withoutView, input));
  });
});
