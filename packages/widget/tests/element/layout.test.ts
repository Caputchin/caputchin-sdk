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

  if (typeof HTMLDialogElement !== 'undefined') {
    const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
      showModal?: () => void;
      close?: () => void;
    };
    if (typeof proto.showModal !== 'function') {
      proto.showModal = function () {
        this.setAttribute('open', '');
      };
    }
    if (typeof proto.close !== 'function') {
      proto.close = function () {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      };
    }
  }
});

describe('CaputchinElement — layout integration', () => {
  it('observedAttributes includes layout', () => {
    expect(CaputchinElement.observedAttributes).toContain('layout');
  });

  it('mounts without throwing with layout="inline"', () => {
    const el = getTestElement({ sitekey: 'k', layout: 'inline' });
    expect(() => document.body.appendChild(el)).not.toThrow();
    el.remove();
  });

  it('mounts without throwing with layout="modal"', () => {
    const el = getTestElement({ sitekey: 'k', layout: 'modal' });
    expect(() => document.body.appendChild(el)).not.toThrow();
    el.remove();
  });

  it('mounts without throwing with layout="fullscreen"', () => {
    const el = getTestElement({ sitekey: 'k', layout: 'fullscreen' });
    expect(() => document.body.appendChild(el)).not.toThrow();
    el.remove();
  });

  it('mounts without throwing with layout="auto"', () => {
    const el = getTestElement({ sitekey: 'k', layout: 'auto' });
    expect(() => document.body.appendChild(el)).not.toThrow();
    el.remove();
  });

  it('attaches shadow root when game-only with game-src and layout="modal"', async () => {
    const el = getTestElement({
      'game-src': 'https://example.com/game.js',
      mode: 'game-only',
      layout: 'modal',
    });
    document.body.appendChild(el);
    // Let the microtasks before manifest-await drain
    await Promise.resolve();
    expect(el.shadowRoot).not.toBeNull();
    el.remove();
  });

  it('fires invalid-config error event on invalid layout value but does not throw', () => {
    const el = getTestElement({ sitekey: 'k', layout: 'bogus' });
    const errors: CustomEvent[] = [];
    el.addEventListener('error', (e) => errors.push(e as CustomEvent));
    expect(() => document.body.appendChild(el)).not.toThrow();
    const layoutErr = errors.find((e) => (e.detail as { message: string }).message.includes('layout="bogus"'));
    expect(layoutErr).toBeDefined();
    expect((layoutErr!.detail as { code: string }).code).toBe('invalid-config');
    el.remove();
  });
});
