import { describe, it, expect, beforeAll, vi } from 'vitest';
import { installCustomFetch } from '../../src/cap/custom-fetch.js';
import { getTestElement } from '../fixtures/test-element.js';

(globalThis as Record<string, unknown>)['__CAPUTCHIN_API_HOST__'] = 'https://api.test.com';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME__'] = '';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME_SHA256__'] = '';

beforeAll(() => {
  installCustomFetch();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
});

function mountEl(attrs: Record<string, string>) {
  const el = getTestElement(attrs);
  const errors: CustomEvent[] = [];
  el.addEventListener('error', (e) => errors.push(e as CustomEvent));
  document.body.appendChild(el);
  return { el, errors };
}

describe('validation error events', () => {
  it('missing sitekey emits invalid-config', () => {
    const { errors, el } = mountEl({});
    expect(errors[0]?.detail.code).toBe('invalid-config');
    el.remove();
  });

  it('manual + game emits invalid-config', () => {
    const { errors, el } = mountEl({ sitekey: 'k', game: '@org/g', mode: 'manual' });
    expect(errors[0]?.detail.code).toBe('invalid-config');
    el.remove();
  });

  it('manual + game-src emits invalid-config', () => {
    const { errors, el } = mountEl({ sitekey: 'k', 'game-src': 'https://x.com/g.js', mode: 'manual' });
    expect(errors[0]?.detail.code).toBe('invalid-config');
    el.remove();
  });

  it('invalid game-src scheme emits invalid-config', () => {
    const { errors, el } = mountEl({ sitekey: 'k', 'game-src': 'http://x.com/g.js' });
    expect(errors[0]?.detail.code).toBe('invalid-config');
    el.remove();
  });
});
