import { describe, it, expect, beforeAll, vi } from 'vitest';
import { CaputchinElement } from '../../src/element.js';
import { installCustomFetch } from '../../src/cap/custom-fetch.js';
import { getTestElement } from '../fixtures/test-element.js';

(globalThis as Record<string, unknown>)['__CAPUTCHIN_API_HOST__'] = 'https://api.test.com';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME__'] = '';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME_SHA256__'] = '';

beforeAll(() => {
  installCustomFetch();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
});

describe('CaputchinElement lifecycle', () => {
  it('observedAttributes includes required attributes', () => {
    expect(CaputchinElement.observedAttributes).toContain('sitekey');
    expect(CaputchinElement.observedAttributes).toContain('mode');
    expect(CaputchinElement.observedAttributes).toContain('game');
    expect(CaputchinElement.observedAttributes).toContain('games');
    expect(CaputchinElement.observedAttributes).toContain('game-src');
  });

  it('mounts without throwing', () => {
    const el = getTestElement({ sitekey: 'k' });
    expect(() => document.body.appendChild(el)).not.toThrow();
    el.remove();
  });

  it('disconnects cleanly', () => {
    const el = getTestElement({ sitekey: 'k' });
    document.body.appendChild(el);
    expect(() => el.remove()).not.toThrow();
  });

  it('remounts after disconnect', () => {
    const el = getTestElement({ sitekey: 'k' });
    document.body.appendChild(el);
    el.remove();
    expect(() => document.body.appendChild(el)).not.toThrow();
    el.remove();
  });

  it('warns on mid-flight attribute change', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    const el = getTestElement({ sitekey: 'k' });
    document.body.appendChild(el);
    el.setAttribute('sitekey', 'new-k');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('ignored'));
    el.remove();
    warnSpy.mockRestore();
  });
});
