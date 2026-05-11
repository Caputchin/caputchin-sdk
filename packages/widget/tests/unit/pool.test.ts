import { describe, it, expect } from 'vitest';
import { pickFromGamesAttr } from '../../src/pool.js';

describe('pickFromGamesAttr', () => {
  it('returns null for empty string', () => expect(pickFromGamesAttr('')).toBeNull());
  it('returns null for whitespace-only', () => expect(pickFromGamesAttr('  ,  ')).toBeNull());
  it('returns single item', () => expect(pickFromGamesAttr('a')).toBe('a'));
  it('trims entries', () => expect(pickFromGamesAttr('  a  ')).toBe('a'));
  it('returns one of multiple items', () => {
    const ids = ['x', 'y', 'z'];
    for (let i = 0; i < 50; i++) {
      expect(ids).toContain(pickFromGamesAttr('x,y,z'));
    }
  });
  it('skips empty segments', () => expect(pickFromGamesAttr('a,,b')).toMatch(/^(a|b)$/));
});
