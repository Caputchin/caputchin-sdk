import { describe, it, expect, vi, beforeEach } from 'vitest';

import { runManual } from '../../../src/verify/run-manual.js';
import type { WidgetState } from '../../../src/verify/state.js';
import type { GameConfig } from '../../../src/config/game.js';

// runManual orchestrates the customer-driven manual game runner. Two shapes:
// game-only (no sitekey → pure event shell) and cap+manual (arms a gate via
// setupCapSession). @cap.js/widget is globally mocked (tests/setup.ts).

const API = 'https://api.test';

function state(config: Partial<GameConfig> | null, parts: Partial<WidgetState<GameConfig>> = {}): WidgetState<GameConfig> {
  return {
    config: config === null ? null : ({ trigger: 'manual', sitekey: null, ...config } as GameConfig),
    gameStartedEmitted: false,
    ...parts,
  } as WidgetState<GameConfig>;
}

function startEvents(el: HTMLElement): CustomEvent[] {
  const out: CustomEvent[] = [];
  el.addEventListener('start', (e) => out.push(e as CustomEvent));
  return out;
}

beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 200 }))); });

describe('runManual', () => {
  it('no-ops when there is no config', () => {
    const el = document.createElement('div');
    const starts = startEvents(el);
    expect(() => runManual(el, state(null), API)).not.toThrow();
    expect(starts).toHaveLength(0);
  });

  it('game-only (no sitekey): sets verifying, fires start once, no cap client', () => {
    const el = document.createElement('div');
    const starts = startEvents(el);
    const presentation = { setState: vi.fn() };
    const st = state({ sitekey: null }, { gamePresentation: presentation as never });
    runManual(el, st, API);
    expect(presentation.setState).toHaveBeenCalledWith('verifying');
    expect(starts).toHaveLength(1);
    expect(starts[0].detail).toEqual({ gameId: null });
    expect(st.capClient).toBeUndefined();
    // start is idempotent: a re-entrant call would not double-fire
    expect(st.gameStartedEmitted).toBe(true);
  });

  it('cap + manual: arms a cap session and still fires start', () => {
    const el = document.createElement('div');
    const starts = startEvents(el);
    const st = state({ sitekey: 'k' });
    runManual(el, st, API);
    expect(st.capClient).not.toBeNull();
    expect(st.capClient).toBeDefined();
    expect(starts).toHaveLength(1);
  });
});
