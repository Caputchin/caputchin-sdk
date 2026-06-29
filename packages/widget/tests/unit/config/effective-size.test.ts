import { describe, it, expect } from 'vitest';
import { resolvePresentationSize, resolveGameSizing } from '../../../src/config/effective-size.js';

const gc = (p: Partial<{ width: 'auto' | 'full' | number; height: 'full' | number | null; overlayWidth: 'auto' | 'full' | number; overlayHeight: 'full' | number | null }>) =>
  ({ width: 'auto', height: null, overlayWidth: 'auto', overlayHeight: null, ...p } as const);

describe('resolvePresentationSize', () => {
  it('promotes preferred="full" to the shell when the embed leaves the axis unset', () => {
    expect(resolvePresentationSize({ width: 'auto', height: null }, { width: 'full', height: 'full' }))
      .toEqual({ width: 'full', height: 'full' });
  });

  it('leaves the axis unset when there is no preferred value', () => {
    expect(resolvePresentationSize({ width: 'auto', height: null }, null))
      .toEqual({ width: 'auto', height: null });
  });

  it('does NOT surface a preferred px to the shell (it stays on the iframe)', () => {
    expect(resolvePresentationSize({ width: 'auto', height: null }, { width: 320, height: 480 }))
      .toEqual({ width: 'auto', height: null });
  });

  it('an explicit customer "full" is kept (customer wins, no-op merge)', () => {
    expect(resolvePresentationSize({ width: 'full', height: 'full' }, { width: 320, height: 480 }))
      .toEqual({ width: 'full', height: 'full' });
  });

  it('an explicit customer px wins over a preferred="full"', () => {
    expect(resolvePresentationSize({ width: 500, height: 600 }, { width: 'full', height: 'full' }))
      .toEqual({ width: 500, height: 600 });
  });

  it('promotes per axis independently', () => {
    expect(resolvePresentationSize({ width: 'auto', height: 600 }, { width: 'full', height: 'full' }))
      .toEqual({ width: 'full', height: 600 });
  });
});

describe('resolveGameSizing', () => {
  describe('inline (one box)', () => {
    it('entry === footprint === width/height folded with preferred', () => {
      const r = resolveGameSizing(gc({ width: 'auto', height: null }), { width: 'full', height: 'full' }, 'inline');
      expect(r.entry).toEqual({ width: 'full', height: 'full' });
      expect(r.footprint).toEqual({ width: 'full', height: 'full' });
    });

    it('ignores overlay-* entirely (inline has no separate game box)', () => {
      const r = resolveGameSizing(gc({ width: 500, overlayWidth: 'full', overlayHeight: 'full' }), null, 'inline');
      expect(r.entry).toEqual({ width: 500, height: null });
      expect(r.footprint).toEqual({ width: 500, height: null });
    });
  });

  describe('overlay (two boxes)', () => {
    it('entry is the RAW width/height: a preferred="full" does NOT promote the entry', () => {
      const r = resolveGameSizing(gc({ width: 'auto', height: null }), { width: 'full', height: 'full' }, 'modal');
      // entry checkbox is not the game, so it stays auto even though the game prefers full.
      expect(r.entry).toEqual({ width: 'auto', height: null });
      // the game box (footprint) still folds preferred → fills the dialog.
      expect(r.footprint).toEqual({ width: 'full', height: 'full' });
    });

    it('footprint folds the overlay-* attrs with preferred', () => {
      const r = resolveGameSizing(gc({ overlayWidth: 'full', overlayHeight: 720 }), { width: 320, height: 480 }, 'fullscreen');
      expect(r.footprint).toEqual({ width: 'full', height: 720 });
    });

    it('decoupling showcase: px entry + full footprint', () => {
      const r = resolveGameSizing(gc({ width: 500, overlayWidth: 'full' }), null, 'modal');
      expect(r.entry).toEqual({ width: 500, height: null });
      expect(r.footprint).toEqual({ width: 'full', height: null });
    });

    it('both unset: entry hugs (auto), footprint defers to the preferred footprint', () => {
      const r = resolveGameSizing(gc({}), { width: 320, height: 480 }, 'modal');
      expect(r.entry).toEqual({ width: 'auto', height: null });
      // preferred px is NOT folded into the footprint pair (stays auto/null);
      // applyIframeSize later renders the preferred px from that auto.
      expect(r.footprint).toEqual({ width: 'auto', height: null });
    });
  });
});
