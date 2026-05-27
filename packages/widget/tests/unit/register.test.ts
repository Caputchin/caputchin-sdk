import { describe, it, expect, afterEach, vi } from 'vitest';

import { defineCaputchinElements } from '../../src/register.js';
import { CaputchinWidget } from '../../src/elements/widget.js';
import { CaputchinGame } from '../../src/elements/game.js';

// defineCaputchinElements is the single registration side effect shared by the
// ESM entry (src/index.ts) and the IIFE entry (src/entries/widget.ts). It must
// be SSR-safe (no throw when there is no window) yet fail loud in a browser
// that genuinely cannot support Custom Elements.
describe('defineCaputchinElements', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('no-ops off-browser (no window) so an SSR import never throws', () => {
    vi.stubGlobal('window', undefined);
    expect(() => defineCaputchinElements()).not.toThrow();
  });

  it('throws loudly in a browser that lacks Custom Elements support', () => {
    // window present (happy-dom) but customElements absent: a genuinely broken
    // browser where a silent skip would hide the breakage.
    vi.stubGlobal('customElements', undefined);
    expect(() => defineCaputchinElements()).toThrow(/Custom Elements are not supported/);
  });

  it('registers both custom elements when supported', () => {
    defineCaputchinElements();
    expect(customElements.get('caputchin-widget')).toBe(CaputchinWidget);
    expect(customElements.get('caputchin-game')).toBe(CaputchinGame);
  });

  it('is idempotent: a repeat call neither throws nor swaps the registered constructors', () => {
    defineCaputchinElements();
    // Capture whatever is registered now; idempotency means the second call
    // must not replace it. Asserting against the captured refs (not the
    // imported classes) keeps this independent of any prior test's registry
    // state - happy-dom shares one customElements registry across the file.
    const widgetCtor = customElements.get('caputchin-widget');
    const gameCtor = customElements.get('caputchin-game');
    expect(() => defineCaputchinElements()).not.toThrow();
    expect(customElements.get('caputchin-widget')).toBe(widgetCtor);
    expect(customElements.get('caputchin-game')).toBe(gameCtor);
  });
});
