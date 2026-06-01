import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
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

describe('CaputchinGame - preferred layout from bootstrap', () => {
  // Make the bootstrap fetch return a `game.preferred.layout` so the element
  // resolves the shell against it. Only the bootstrap response is mocked;
  // everything downstream (shell build) runs for real.
  function stubBootstrap(preferred: Record<string, unknown> | null): void {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ game: { preferred }, requiresGame: false }), { status: 200 }),
      ),
    );
  }

  afterEach(() => {
    // Restore the suite-wide empty-bootstrap default for any later tests.
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
  });

  it('uses preferred.layout="modal" when the embed leaves layout unset', async () => {
    stubBootstrap({ layout: 'modal' });
    const el = getGame({ sitekey: 'k', game: '@x/y' });
    document.body.appendChild(el);
    await vi.waitFor(() => {
      expect(el.shadowRoot?.querySelector('[part="game-overlay-dialog"][data-layout="modal"]')).not.toBeNull();
    });
    expect(el.shadowRoot?.querySelector('[part="game-frame"][data-layout="inline"]')).toBeNull();
    el.remove();
  });

  it('embed layout="inline" overrides preferred.layout="modal"', async () => {
    stubBootstrap({ layout: 'modal' });
    const el = getGame({ sitekey: 'k', game: '@x/y', layout: 'inline' });
    document.body.appendChild(el);
    await vi.waitFor(() => {
      expect(el.shadowRoot?.querySelector('[part="game-frame"][data-layout="inline"]')).not.toBeNull();
    });
    expect(el.shadowRoot?.querySelector('[part="game-overlay-dialog"]')).toBeNull();
    el.remove();
  });

  it('falls back to inline when preferred.layout is not a real layout', async () => {
    stubBootstrap({ layout: 'sidebar' });
    const el = getGame({ sitekey: 'k', game: '@x/y' });
    document.body.appendChild(el);
    await vi.waitFor(() => {
      expect(el.shadowRoot?.querySelector('[part="game-frame"][data-layout="inline"]')).not.toBeNull();
    });
    expect(el.shadowRoot?.querySelector('[part="game-overlay-dialog"]')).toBeNull();
    el.remove();
  });
});

describe('CaputchinGame - preferred footprint "full" from bootstrap', () => {
  function stubBootstrap(preferred: Record<string, unknown> | null): void {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ game: { preferred }, requiresGame: false }), { status: 200 }),
      ),
    );
  }

  afterEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
  });

  it('inline: preferred.width="full" fills the outer shell (no collapse) when the embed leaves width unset', async () => {
    stubBootstrap({ width: 'full' });
    const el = getGame({ sitekey: 'k', game: '@x/y' });
    document.body.appendChild(el);
    await vi.waitFor(() => {
      // The isFullWidth shell branch fired: frame tagged + host stretched to
      // 100%. Without this the iframe's 100% would collapse against a
      // content-sized host.
      expect(el.shadowRoot?.querySelector('[part="game-frame"][data-width="full"]')).not.toBeNull();
    });
    expect(el.style.width).toBe('100%');
    el.remove();
  });

  it('overlay: preferred.width/height="full" set the dialog fill flags', async () => {
    stubBootstrap({ layout: 'modal', width: 'full', height: 'full' });
    const el = getGame({ sitekey: 'k', game: '@x/y' });
    document.body.appendChild(el);
    await vi.waitFor(() => {
      const dialog = el.shadowRoot?.querySelector('[part="game-overlay-dialog"]') as HTMLElement | null;
      expect(dialog).not.toBeNull();
      expect(dialog!.dataset.fillX).toBe('true');
      expect(dialog!.dataset.fillY).toBe('true');
    });
    el.remove();
  });

  it('an explicit embed width overrides preferred.width="full"', async () => {
    stubBootstrap({ width: 'full' });
    const el = getGame({ sitekey: 'k', game: '@x/y', width: '500' });
    document.body.appendChild(el);
    await vi.waitFor(() => {
      expect(el.shadowRoot?.querySelector('[part="game-frame"][data-layout="inline"]')).not.toBeNull();
    });
    // Customer px wins: the shell is sized to 500px, not stretched full.
    expect(el.shadowRoot?.querySelector('[part="game-frame"][data-width="full"]')).toBeNull();
    expect(el.style.width).toBe('500px');
    el.remove();
  });
});
