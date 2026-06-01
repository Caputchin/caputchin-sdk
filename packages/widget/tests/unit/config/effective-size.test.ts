import { describe, it, expect } from 'vitest';
import { resolvePresentationSize } from '../../../src/config/effective-size.js';

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
