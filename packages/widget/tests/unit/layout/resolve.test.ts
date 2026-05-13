import { describe, it, expect } from 'vitest';
import { resolveLayout } from '../../../src/layout/resolve.js';

describe('resolveLayout — resolution order', () => {
  it('attr wins over manifest', () => {
    expect(resolveLayout({ attr: 'inline', manifestPreferred: 'modal', autoIsWide: true })).toEqual({
      layout: 'inline',
      source: 'attr',
    });
  });

  it('manifest used when attr is null', () => {
    expect(resolveLayout({ attr: null, manifestPreferred: 'fullscreen', autoIsWide: false })).toEqual({
      layout: 'fullscreen',
      source: 'manifest',
    });
  });

  it('defaults to inline when both null', () => {
    expect(resolveLayout({ attr: null, manifestPreferred: null, autoIsWide: true })).toEqual({
      layout: 'inline',
      source: 'default',
    });
  });

  it('attr="auto" wide → modal, source=attr', () => {
    expect(resolveLayout({ attr: 'auto', manifestPreferred: 'inline', autoIsWide: true })).toEqual({
      layout: 'modal',
      source: 'attr',
    });
  });

  it('attr="auto" narrow → fullscreen, source=attr', () => {
    expect(resolveLayout({ attr: 'auto', manifestPreferred: 'inline', autoIsWide: false })).toEqual({
      layout: 'fullscreen',
      source: 'attr',
    });
  });

  it('attr="auto" still overrides manifest', () => {
    expect(resolveLayout({ attr: 'auto', manifestPreferred: 'fullscreen', autoIsWide: true })).toEqual({
      layout: 'modal',
      source: 'attr',
    });
  });

  it('explicit attr inline overrides manifest fullscreen (regression)', () => {
    expect(resolveLayout({ attr: 'inline', manifestPreferred: 'fullscreen', autoIsWide: false })).toEqual({
      layout: 'inline',
      source: 'attr',
    });
  });
});
