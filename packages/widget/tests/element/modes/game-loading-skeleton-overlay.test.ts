import { describe, it, expect, afterEach, vi } from 'vitest';
import { getGame } from '../../fixtures/test-element.js';

// Regression: the first-load loading skeleton must reserve the customer's
// explicit width on the HOST for overlay (modal / fullscreen) layouts too -
// not just inline. The loaded overlay ENTRY (a "Verify" checkbox) honours
// width="full" / a pixel width (createOverlayGame sizes host + wrappers), so a
// skeleton that ignored it rendered a narrow min-size box that then JUMPED to
// the full / pixel width once the bootstrap resolved. applyLoadingHostSize now
// reserves the host width in every layout, and the overlay skeleton box fills
// it (data-sized -> width:100%) instead of hugging its min-size floor.

(globalThis as Record<string, unknown>)['__CAPUTCHIN_API_HOST__'] = 'https://api.test.com';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME__'] = '';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME_SHA256__'] = '';

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/** A fetch that never resolves, so the skeleton stays up for inspection. */
function pendingFetch(): ReturnType<typeof vi.fn> {
  return vi.fn(() => new Promise<Response>(() => {}));
}

describe('overlay loading skeleton reserves the customer width (no width jump)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('modal + width="full": host reserves 100% and the skeleton box fills it', async () => {
    vi.stubGlobal('fetch', pendingFetch());
    const el = getGame({ game: 'acme/games/sample', 'no-verify': '', layout: 'modal', width: 'full' });
    document.body.appendChild(el);
    await flush();

    const box = el.shadowRoot?.querySelector('[part="loading"]') as HTMLElement | null;
    expect(box).not.toBeNull();
    // Entry-sized overlay placeholder, flagged as width-pinned.
    expect(box!.hasAttribute('data-overlay')).toBe(true);
    expect(box!.hasAttribute('data-sized')).toBe(true);
    // Host reserves the eventual full-width footprint NOW.
    expect(el.style.display).toBe('block');
    expect(el.style.width).toBe('100%');
    el.remove();
  });

  it('modal + pixel width: host reserves the pixel width and the box is flagged', async () => {
    vi.stubGlobal('fetch', pendingFetch());
    const el = getGame({ game: 'acme/games/sample', 'no-verify': '', layout: 'modal', width: '300' });
    document.body.appendChild(el);
    await flush();

    const box = el.shadowRoot?.querySelector('[part="loading"]') as HTMLElement | null;
    expect(box).not.toBeNull();
    expect(box!.hasAttribute('data-overlay')).toBe(true);
    expect(box!.hasAttribute('data-sized')).toBe(true);
    expect(el.style.display).toBe('block');
    expect(el.style.width).toBe('300px');
    el.remove();
  });

  it('modal + auto width: nothing reserved, skeleton keeps its content-hugging floor', async () => {
    vi.stubGlobal('fetch', pendingFetch());
    const el = getGame({ game: 'acme/games/sample', 'no-verify': '', layout: 'modal' });
    document.body.appendChild(el);
    await flush();

    const box = el.shadowRoot?.querySelector('[part="loading"]') as HTMLElement | null;
    expect(box).not.toBeNull();
    expect(box!.hasAttribute('data-overlay')).toBe(true);
    // Auto width has no footprint to reserve - the box stays unflagged (floor governs).
    expect(box!.hasAttribute('data-sized')).toBe(false);
    expect(el.style.width).toBe('');
    el.remove();
  });

  it('fullscreen + width="full": host reserves 100% just like modal', async () => {
    vi.stubGlobal('fetch', pendingFetch());
    const el = getGame({ game: 'acme/games/sample', 'no-verify': '', layout: 'fullscreen', width: 'full' });
    document.body.appendChild(el);
    await flush();

    const box = el.shadowRoot?.querySelector('[part="loading"]') as HTMLElement | null;
    expect(box).not.toBeNull();
    expect(box!.hasAttribute('data-overlay')).toBe(true);
    expect(box!.hasAttribute('data-sized')).toBe(true);
    expect(el.style.width).toBe('100%');
    el.remove();
  });

  // height="full" is asymmetric: the loaded overlay entry routes it to an inner
  // wrapper, never the host (the simple presentation host-applies only PIXEL
  // height). So the skeleton must NOT reserve host height:100% for an overlay -
  // it would stick (never re-applied, never reset on unmount) and stretch the
  // loaded entry. Pixel height IS host-applied + reset, so it stays reserved.
  it('modal + height="full": host height is NOT reserved (no stale leak into the loaded entry)', async () => {
    vi.stubGlobal('fetch', pendingFetch());
    const el = getGame({ game: 'acme/games/sample', 'no-verify': '', layout: 'modal', height: 'full' });
    document.body.appendChild(el);
    await flush();

    expect(el.shadowRoot?.querySelector('[part="loading"]')).not.toBeNull();
    expect(el.style.height).toBe('');
    el.remove();
  });

  it('modal + pixel height: host DOES reserve it (the loaded entry re-applies + resets it)', async () => {
    vi.stubGlobal('fetch', pendingFetch());
    const el = getGame({ game: 'acme/games/sample', 'no-verify': '', layout: 'modal', height: '300' });
    document.body.appendChild(el);
    await flush();

    expect(el.shadowRoot?.querySelector('[part="loading"]')).not.toBeNull();
    expect(el.style.height).toBe('300px');
    el.remove();
  });

  it('inline + height="full": host DOES reserve 100% (createInlineGame re-applies + resets it)', async () => {
    vi.stubGlobal('fetch', pendingFetch());
    const el = getGame({ game: 'acme/games/sample', 'no-verify': '', layout: 'inline', height: 'full' });
    document.body.appendChild(el);
    await flush();

    expect(el.shadowRoot?.querySelector('[part="loading"]')).not.toBeNull();
    expect(el.style.height).toBe('100%');
    el.remove();
  });
});
