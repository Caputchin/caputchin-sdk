import { describe, it, expect, beforeEach, vi } from 'vitest';

import { setCapAssetUrlsFrom } from '../../../src/cap/asset-urls.js';

// The widget ships cap.js's wasm + pako next to its bundle and points cap.js at
// them by setting window.CAP_CUSTOM_WASM_URL / CAP_PAKO_URL. Two delivery
// paths: the ESM entry (src/index.ts) sets them via
// `new URL('./cap_wasm_bg.wasm', import.meta.url)` so a bundler re-emits the
// assets same-origin; the IIFE entries call setCapAssetUrlsFrom with
// document.currentScript.src. These assert the behavioural contract (globals
// populated, relative to the right base, host override preserved). The actual
// same-origin emission is a property of the consumer's bundler, verified at
// integration time, not here.

describe('ESM entry cap asset self-set', () => {
  beforeEach(() => {
    vi.resetModules();
    delete window.CAP_CUSTOM_WASM_URL;
    delete window.CAP_PAKO_URL;
  });

  it('populates both URLs on import when unset', async () => {
    await import('../../../src/index.js');
    expect(window.CAP_CUSTOM_WASM_URL).toContain('cap_wasm_bg.wasm');
    expect(window.CAP_PAKO_URL).toContain('pako_inflate.min.js');
  });

  it('preserves a host-provided override (does not clobber)', async () => {
    window.CAP_CUSTOM_WASM_URL = 'https://example.test/custom.wasm';
    window.CAP_PAKO_URL = 'https://example.test/custom-pako.js';
    await import('../../../src/index.js');
    expect(window.CAP_CUSTOM_WASM_URL).toBe('https://example.test/custom.wasm');
    expect(window.CAP_PAKO_URL).toBe('https://example.test/custom-pako.js');
  });
});

describe('setCapAssetUrlsFrom (IIFE script-relative)', () => {
  beforeEach(() => {
    delete window.CAP_CUSTOM_WASM_URL;
    delete window.CAP_PAKO_URL;
  });

  it('resolves both assets relative to the script URL', () => {
    setCapAssetUrlsFrom('https://cdn.example.com/npm/@caputchin/widget/dist/all.js');
    expect(window.CAP_CUSTOM_WASM_URL).toBe(
      'https://cdn.example.com/npm/@caputchin/widget/dist/cap_wasm_bg.wasm',
    );
    expect(window.CAP_PAKO_URL).toBe(
      'https://cdn.example.com/npm/@caputchin/widget/dist/pako_inflate.min.js',
    );
  });

  it('no-ops without a base URL, leaving cap.js on its default', () => {
    setCapAssetUrlsFrom(undefined);
    expect(window.CAP_CUSTOM_WASM_URL).toBeUndefined();
    setCapAssetUrlsFrom(null);
    expect(window.CAP_PAKO_URL).toBeUndefined();
  });

  it('preserves a host-provided override', () => {
    window.CAP_CUSTOM_WASM_URL = 'https://example.test/custom.wasm';
    setCapAssetUrlsFrom('https://cdn.example.com/dist/all.js');
    expect(window.CAP_CUSTOM_WASM_URL).toBe('https://example.test/custom.wasm');
    // the unset one still gets the script-relative default
    expect(window.CAP_PAKO_URL).toBe('https://cdn.example.com/dist/pako_inflate.min.js');
  });
});
