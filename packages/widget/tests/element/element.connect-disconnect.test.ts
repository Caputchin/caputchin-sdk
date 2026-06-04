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
    expect(CaputchinWidget.observedAttributes).toEqual(['sitekey', 'invisible', 'trigger', 'width', 'height', 'size', 'locale', 'skin', 'api-host']);
  });

  it('does NOT observe game attrs (game attrs belong on <caputchin-game>)', () => {
    expect(CaputchinWidget.observedAttributes).not.toContain('game');
    expect(CaputchinWidget.observedAttributes).not.toContain('layout');
    expect(CaputchinWidget.observedAttributes).not.toContain('mode');
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
      ['sitekey', 'no-verify', 'trigger', 'width', 'height', 'game', 'games', 'game-src', 'layout', 'locale', 'skin', 'api-host']
    );
  });

  it('does NOT observe size (size is implicit per layout on game widget)', () => {
    expect(CaputchinGame.observedAttributes).not.toContain('size');
  });

  it('does NOT observe mode (no mode on game widget)', () => {
    expect(CaputchinGame.observedAttributes).not.toContain('mode');
  });

  it('observes trigger (only "manual" is customer-settable; auto/click are layout-derived)', () => {
    expect(CaputchinGame.observedAttributes).toContain('trigger');
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

describe('bootstrap degrade is observable (not silent)', () => {
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('fires the `degraded` event with a reason when the resolve times out', async () => {
    // A per-attempt timeout (AbortError) is terminal in the resilient loop, so
    // this is one fast reject rather than the full retry budget.
    vi.mocked(fetch).mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const el = getGame({ game: '@x/y' });
    const reasons: string[] = [];
    el.addEventListener('degraded', (e) => reasons.push((e as CustomEvent).detail.reason));
    document.body.appendChild(el);
    await flush();
    expect(reasons).toContain('timeout');
    el.remove();
  });

  it('aborts the in-flight bootstrap on disconnect (no late mount, no throw)', async () => {
    let abortedSignal: AbortSignal | null = null;
    vi.mocked(fetch).mockImplementationOnce((_url: string, init?: RequestInit) => {
      abortedSignal = init?.signal ?? null;
      // Never resolves on its own; disconnect must abort it.
      return new Promise((_res, rej) => {
        init?.signal?.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      });
    });
    const el = getGame({ game: '@x/y' });
    document.body.appendChild(el);
    el.remove();
    await flush();
    expect(abortedSignal).not.toBeNull();
    expect(abortedSignal!.aborted).toBe(true);
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
