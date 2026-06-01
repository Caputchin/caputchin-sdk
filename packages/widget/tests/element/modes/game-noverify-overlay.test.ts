import { describe, it, expect, beforeAll, vi } from 'vitest';
import { getGame } from '../../fixtures/test-element.js';

// The no-verify / no-sitekey game path runs through the same trigger axis as
// the gated path. For overlay layouts (modal / fullscreen) that means the game
// (and its verifying indicator) must NOT start on mount - it starts only when
// the user opens the dialog. Showing the verifying spinner on a closed
// overlay's entry before any interaction was the reported regression. Inline
// keeps loading on mount (the iframe is visible immediately).

(globalThis as Record<string, unknown>)['__CAPUTCHIN_API_HOST__'] = 'https://api.test.com';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME__'] = '';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME_SHA256__'] = '';

beforeAll(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
  if (typeof HTMLDialogElement !== 'undefined') {
    const proto = HTMLDialogElement.prototype as HTMLDialogElement & { showModal?: () => void; close?: () => void };
    if (typeof proto.showModal !== 'function') proto.showModal = function () { this.setAttribute('open', ''); };
    if (typeof proto.close !== 'function') {
      proto.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
    }
  }
});

// One macrotask flush lets the mount chain (completeMount → trigger.activate →
// runGameOnly → resolveGameUrl microtask hop) settle before asserting.
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

const shieldState = (el: HTMLElement): string | null =>
  el.shadowRoot?.querySelector('[part="simple-shield-box"]')?.getAttribute('data-state') ?? null;

describe('no-verify overlay does not show verifying on mount', () => {
  for (const layout of ['modal', 'fullscreen'] as const) {
    it(`${layout}: entry stays idle on mount (no premature verifying)`, async () => {
      const el = getGame({ 'game-src': 'https://example.com/game.js', layout });
      document.body.appendChild(el);
      await flush();
      expect(shieldState(el)).toBe('idle');
      // Dialog is not opened until the user activates the entry.
      expect(el.shadowRoot?.querySelector('dialog')?.hasAttribute('open')).toBe(false);
      el.remove();
    });

    it(`${layout}: opens the dialog and shows verifying only after the entry is clicked`, async () => {
      const el = getGame({ 'game-src': 'https://example.com/game.js', layout });
      document.body.appendChild(el);
      await flush();

      const shield = el.shadowRoot!.querySelector('[part="simple-shield-box"]') as SVGElement;
      shield.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();

      expect(el.shadowRoot?.querySelector('dialog')?.hasAttribute('open')).toBe(true);
      expect(shieldState(el)).toBe('verifying');
      el.remove();
    });
  }
});

describe('no-verify inline still loads on mount', () => {
  it('inline: shows verifying on mount (iframe is visible immediately)', async () => {
    const el = getGame({ 'game-src': 'https://example.com/game.js', layout: 'inline' });
    document.body.appendChild(el);
    await flush();
    expect(shieldState(el)).toBe('verifying');
    el.remove();
  });
});
