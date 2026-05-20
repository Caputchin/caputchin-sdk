import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CaputchinWidget } from '../../src/elements/widget.js';
import { CaputchinGame } from '../../src/elements/game.js';
import { installCustomFetch } from '../../src/cap/custom-fetch.js';
import { getWidget, getGame } from '../fixtures/test-element.js';

(globalThis as Record<string, unknown>)['__CAPUTCHIN_API_HOST__'] = 'https://api.test.com';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME__'] = '';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME_SHA256__'] = '';

beforeAll(() => {
  installCustomFetch();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
});

describe('CaputchinWidget lifecycle', () => {
  it('observedAttributes covers cap surface', () => {
    expect(CaputchinWidget.observedAttributes).toEqual(['sitekey', 'mode', 'trigger', 'width', 'size']);
  });

  it('does NOT observe game attrs (game attrs belong on <caputchin-game>)', () => {
    expect(CaputchinWidget.observedAttributes).not.toContain('game');
    expect(CaputchinWidget.observedAttributes).not.toContain('layout');
  });

  it('mounts without throwing', () => {
    const el = getWidget({ sitekey: 'k' });
    expect(() => document.body.appendChild(el)).not.toThrow();
    el.remove();
  });

  it('disconnects + remounts cleanly', () => {
    const el = getWidget({ sitekey: 'k' });
    document.body.appendChild(el);
    el.remove();
    expect(() => document.body.appendChild(el)).not.toThrow();
    el.remove();
  });

  it('warns on mid-flight attribute change', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    const el = getWidget({ sitekey: 'k' });
    document.body.appendChild(el);
    el.setAttribute('sitekey', 'new-k');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('ignored'));
    el.remove();
    warnSpy.mockRestore();
  });
});

describe('CaputchinGame lifecycle', () => {
  it('observedAttributes covers game surface', () => {
    expect(CaputchinGame.observedAttributes).toEqual(
      ['sitekey', 'trigger', 'width', 'height', 'size', 'game', 'games', 'game-src', 'layout']
    );
  });

  it('does NOT observe mode (no mode on game widget)', () => {
    expect(CaputchinGame.observedAttributes).not.toContain('mode');
  });

  it('mounts without sitekey (game-only path) without throwing', () => {
    const el = getGame({ game: '@x/y' });
    expect(() => document.body.appendChild(el)).not.toThrow();
    el.remove();
  });

  it('mounts with sitekey (play+verify path) without throwing', () => {
    const el = getGame({ sitekey: 'k', game: '@x/y' });
    expect(() => document.body.appendChild(el)).not.toThrow();
    el.remove();
  });

  it('start event in run-game.ts defers behind installGameFrame onGameStarted', () => {
    const runSrc = readFileSync(resolve(__dirname, '../../src/verify/run-game.ts'), 'utf-8');
    expect(runSrc).toContain('installGameFrame(');
    expect(runSrc).toContain('dispatchStart()');
    expect(runSrc).toContain('gameStartedEmitted');
  });
});

describe('both widgets coexist', () => {
  it('register independently and both work on one page', () => {
    const w = getWidget({ sitekey: 'k' });
    const g = getGame({ game: '@x/y' });
    document.body.appendChild(w);
    document.body.appendChild(g);
    expect(customElements.get('caputchin-widget')).toBe(CaputchinWidget);
    expect(customElements.get('caputchin-game')).toBe(CaputchinGame);
    w.remove();
    g.remove();
  });
});
