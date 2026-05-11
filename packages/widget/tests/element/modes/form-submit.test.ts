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

describe('form-submit mode', () => {
  it('emits form-not-found error when no enclosing form', () => {
    const el = getTestElement({ sitekey: 'k', mode: 'form-submit' });
    const errors: CustomEvent[] = [];
    el.addEventListener('error', (e) => errors.push(e as CustomEvent));
    document.body.appendChild(el);

    expect(errors.some((e) => e.detail.code === 'form-not-found')).toBe(true);
    el.remove();
  });

  it('prevents default submit when inside form', () => {
    const form = document.createElement('form');
    const el = getTestElement({ sitekey: 'k', mode: 'form-submit' });
    form.appendChild(el);
    document.body.appendChild(form);

    const event = new SubmitEvent('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);

    el.remove();
    form.remove();
  });
});
