import { describe, it, expect, beforeAll, vi } from 'vitest';
import { installCustomFetch } from '../../../src/cap/custom-fetch.js';
import { getTestElement } from '../../fixtures/test-element.js';

(globalThis as Record<string, unknown>)['__CAPUTCHIN_API_HOST__'] = 'https://api.test.com';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME__'] = '';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME_SHA256__'] = '';

beforeAll(() => {
  installCustomFetch();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
});

describe('manual mode', () => {
  it('exposes start/complete/setNickname on element', () => {
    const el = getTestElement({ sitekey: 'k', mode: 'manual' });
    document.body.appendChild(el);

    expect(typeof (el as Record<string, unknown>)['start']).toBe('function');
    expect(typeof (el as Record<string, unknown>)['complete']).toBe('function');
    expect(typeof (el as Record<string, unknown>)['setNickname']).toBe('function');

    el.remove();
  });

  it('does not expose start in auto mode', () => {
    const el = getTestElement({ sitekey: 'k' });
    document.body.appendChild(el);

    expect((el as Record<string, unknown>)['start']).toBeUndefined();

    el.remove();
  });

  it('start is idempotent', () => {
    const el = getTestElement({ sitekey: 'k', mode: 'manual' });
    document.body.appendChild(el);

    const startFn = (el as Record<string, unknown>)['start'] as () => void;
    expect(() => { startFn(); startFn(); }).not.toThrow();

    el.remove();
  });

  it('setNickname throws — Post-MVP not implemented', () => {
    const el = getTestElement({ sitekey: 'k', mode: 'manual' });
    document.body.appendChild(el);

    const setNicknameFn = (el as Record<string, unknown>)['setNickname'] as (s: string) => void;
    expect(() => setNicknameFn('AAA')).toThrow('not implemented');

    el.remove();
  });

  it('complete() warns and no-ops when called before start() (M4)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = getTestElement({ sitekey: 'k', mode: 'manual' });
    document.body.appendChild(el);

    const completeFn = (el as Record<string, unknown>)['complete'] as (p: { score: null; durationMs: null }) => void;
    completeFn({ score: null, durationMs: null });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('widget.complete() called before widget.start()'));

    warnSpy.mockRestore();
    el.remove();
  });
});
