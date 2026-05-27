import { describe, it, expect, beforeAll, vi } from 'vitest';
import { CaputchinGame } from '../../src/elements/game.js';
import { installCustomFetch } from '../../src/cap/custom-fetch.js';
import { getGame } from '../fixtures/test-element.js';

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
      proto.showModal = function () { this.setAttribute('open', ''); };
    }
    if (typeof proto.close !== 'function') {
      proto.close = function () {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      };
    }
  }
});

describe('CaputchinGame - layout integration', () => {
  it('observedAttributes includes layout', () => {
    expect(CaputchinGame.observedAttributes).toContain('layout');
  });

  for (const layout of ['inline', 'modal', 'fullscreen', 'auto'] as const) {
    it(`mounts without throwing with layout="${layout}"`, () => {
      const el = getGame({ sitekey: 'k', game: '@x/y', layout });
      expect(() => document.body.appendChild(el)).not.toThrow();
      el.remove();
    });
  }

  it('attaches shadow root for game-only with game-src and layout="modal"', async () => {
    const el = getGame({
      'game-src': 'https://example.com/game.js',
      layout: 'modal',
    });
    document.body.appendChild(el);
    await Promise.resolve();
    expect(el.shadowRoot).not.toBeNull();
    el.remove();
  });

  it('fires invalid-config error on bogus layout but does not throw', () => {
    const el = getGame({ sitekey: 'k', game: '@x/y', layout: 'bogus' });
    const errors: CustomEvent[] = [];
    el.addEventListener('error', (e) => errors.push(e as CustomEvent));
    expect(() => document.body.appendChild(el)).not.toThrow();
    const layoutErr = errors.find((e) => (e.detail as { message: string }).message.includes('layout="bogus"'));
    expect(layoutErr).toBeDefined();
    expect((layoutErr!.detail as { code: string }).code).toBe('invalid-config');
    el.remove();
  });
});
