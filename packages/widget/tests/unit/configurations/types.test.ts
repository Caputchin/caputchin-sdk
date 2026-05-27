import { describe, it, expect } from 'vitest';
import { normalizeSchemaEntry, validateConfigValue } from '../../../src/configurations/types.js';

describe('normalizeSchemaEntry', () => {
  it('accepts bare-type string for string/link/boolean/number', () => {
    expect(normalizeSchemaEntry('string')).toEqual({ type: 'string' });
    expect(normalizeSchemaEntry('link')).toEqual({ type: 'link' });
    expect(normalizeSchemaEntry('boolean')).toEqual({ type: 'boolean' });
    expect(normalizeSchemaEntry('number')).toEqual({ type: 'number' });
  });
  it('accepts array literal as list enum', () => {
    expect(normalizeSchemaEntry(['a', 'b', 'c'])).toEqual({ type: 'list', values: ['a', 'b', 'c'] });
  });
  it('dedupes array-literal enum values silently', () => {
    expect(normalizeSchemaEntry(['a', 'a', 'b'])).toEqual({ type: 'list', values: ['a', 'b'] });
  });
  it('dedupes descriptor-form list values silently', () => {
    expect(normalizeSchemaEntry({ type: 'list', values: ['x', 'y', 'x'] })).toEqual({ type: 'list', values: ['x', 'y'] });
  });
  it('accepts full descriptor for primitive types', () => {
    expect(normalizeSchemaEntry({ type: 'boolean', name: 'Show', description: 'desc' })).toEqual({ type: 'boolean' });
  });
  it('accepts full descriptor for list with values', () => {
    expect(normalizeSchemaEntry({ type: 'list', values: ['x', 'y'] })).toEqual({ type: 'list', values: ['x', 'y'] });
  });
  it('accepts full descriptor for range with min/max/step', () => {
    expect(normalizeSchemaEntry({ type: 'range', min: 0, max: 10, step: 1 })).toEqual({ type: 'range', min: 0, max: 10, step: 1 });
  });
  it('range descriptor rejects missing bounds', () => {
    // @ts-expect-error - min missing on purpose
    expect(normalizeSchemaEntry({ type: 'range', max: 10 })).toBeNull();
  });
  it('returns null for unknown bare type', () => {
    // @ts-expect-error - not a valid bare type
    expect(normalizeSchemaEntry('color')).toBeNull();
  });
  it('returns null for undefined', () => {
    expect(normalizeSchemaEntry(undefined)).toBeNull();
  });
});

describe('validateConfigValue - string', () => {
  it('accepts non-empty string', () => expect(validateConfigValue({ type: 'string' }, 'hi').ok).toBe(true));
  it('rejects empty string', () => expect(validateConfigValue({ type: 'string' }, '').ok).toBe(false));
  it('rejects boolean', () => expect(validateConfigValue({ type: 'string' }, true).ok).toBe(false));
  it('rejects number', () => expect(validateConfigValue({ type: 'string' }, 1).ok).toBe(false));
});

describe('validateConfigValue - link', () => {
  it('accepts https://', () => expect(validateConfigValue({ type: 'link' }, 'https://example.com/legal').ok).toBe(true));
  it('accepts http://', () => expect(validateConfigValue({ type: 'link' }, 'http://example.com').ok).toBe(true));
  it('rejects data: URI', () => {
    const v = validateConfigValue({ type: 'link' }, 'data:text/html,<p>x</p>');
    expect(v.ok).toBe(false);
  });
  it('rejects javascript: URI', () => {
    const v = validateConfigValue({ type: 'link' }, 'javascript:alert(1)');
    expect(v.ok).toBe(false);
  });
  it('rejects relative path', () => {
    expect(validateConfigValue({ type: 'link' }, '/policy').ok).toBe(false);
  });
  it('rejects malformed URL', () => {
    expect(validateConfigValue({ type: 'link' }, 'not a url').ok).toBe(false);
  });
  it('rejects URL with embedded user credentials', () => {
    const v = validateConfigValue({ type: 'link' }, 'https://user:pass@example.com/x');
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toContain('credentials');
  });
  it('rejects URL with just a username (no password)', () => {
    expect(validateConfigValue({ type: 'link' }, 'https://user@example.com/x').ok).toBe(false);
  });
});

describe('validateConfigValue - boolean', () => {
  it('accepts true', () => expect(validateConfigValue({ type: 'boolean' }, true).ok).toBe(true));
  it('accepts false', () => expect(validateConfigValue({ type: 'boolean' }, false).ok).toBe(true));
  it('rejects "true" string', () => expect(validateConfigValue({ type: 'boolean' }, 'true').ok).toBe(false));
  it('rejects 1', () => expect(validateConfigValue({ type: 'boolean' }, 1).ok).toBe(false));
});

describe('validateConfigValue - number', () => {
  it('accepts integer', () => expect(validateConfigValue({ type: 'number' }, 42).ok).toBe(true));
  it('accepts float', () => expect(validateConfigValue({ type: 'number' }, 1.5).ok).toBe(true));
  it('accepts negative', () => expect(validateConfigValue({ type: 'number' }, -7).ok).toBe(true));
  it('rejects NaN', () => expect(validateConfigValue({ type: 'number' }, NaN).ok).toBe(false));
  it('rejects Infinity', () => expect(validateConfigValue({ type: 'number' }, Infinity).ok).toBe(false));
  it('rejects "42" string', () => expect(validateConfigValue({ type: 'number' }, '42').ok).toBe(false));
});

describe('validateConfigValue - range', () => {
  const entry = { type: 'range' as const, min: 0, max: 10, step: 0.5 };
  it('accepts number in range', () => expect(validateConfigValue(entry, 5).ok).toBe(true));
  it('accepts boundary min', () => expect(validateConfigValue(entry, 0).ok).toBe(true));
  it('accepts boundary max', () => expect(validateConfigValue(entry, 10).ok).toBe(true));
  it('accepts non-step value (step is authoring hint)', () => expect(validateConfigValue(entry, 5.3).ok).toBe(true));
  it('rejects below min', () => expect(validateConfigValue(entry, -1).ok).toBe(false));
  it('rejects above max', () => expect(validateConfigValue(entry, 11).ok).toBe(false));
  it('rejects NaN', () => expect(validateConfigValue(entry, NaN).ok).toBe(false));
  it('rejects boolean', () => expect(validateConfigValue(entry, true).ok).toBe(false));
});

describe('validateConfigValue - list', () => {
  const entry = { type: 'list' as const, values: ['easy', 'medium', 'hard'] };
  it('accepts enum member', () => expect(validateConfigValue(entry, 'easy').ok).toBe(true));
  it('rejects non-member', () => expect(validateConfigValue(entry, 'extreme').ok).toBe(false));
  it('rejects exact-case-mismatch', () => expect(validateConfigValue(entry, 'EASY').ok).toBe(false));
  it('rejects number', () => expect(validateConfigValue(entry, 1).ok).toBe(false));
  it('rejects empty enum (never accepts anything)', () => {
    expect(validateConfigValue({ type: 'list', values: [] }, 'anything').ok).toBe(false);
  });
});
