import { describe, it, expect } from 'vitest';
import type { ConfigPreset, ConfigSchemaEntry } from '@caputchin/game-sdk';
import { resolveConfig } from '../../../src/configurations/resolver.js';

const SIMPLE_PRESETS: Record<string, ConfigPreset> = {
  default: { _default: true, show_high_score: true, difficulty: 'medium' },
  hard: { _extends: 'default', difficulty: 'hard' },
};

const SIMPLE_SCHEMA: Record<string, ConfigSchemaEntry> = {
  show_high_score: 'boolean',
  difficulty: ['easy', 'medium', 'hard'],
};

describe('resolveConfig — basic cascade', () => {
  it('empty presets returns null', () => {
    const r = resolveConfig({ presets: {}, attrValue: 'default' });
    expect(r.resolved).toBeNull();
  });

  it('attr="default" picks the default preset', () => {
    const r = resolveConfig({ presets: SIMPLE_PRESETS, schema: SIMPLE_SCHEMA, attrValue: 'default' });
    expect(r.resolved?.['show_high_score']).toBe(true);
    expect(r.resolved?.['difficulty']).toBe('medium');
  });

  it('attr="auto" picks the _default:true preset', () => {
    const r = resolveConfig({ presets: SIMPLE_PRESETS, schema: SIMPLE_SCHEMA, attrValue: 'auto' });
    expect(r.resolved?.['difficulty']).toBe('medium');
  });

  it('attr=null picks the _default:true preset', () => {
    const r = resolveConfig({ presets: SIMPLE_PRESETS, schema: SIMPLE_SCHEMA, attrValue: null });
    expect(r.resolved?.['difficulty']).toBe('medium');
  });

  it('falls back to first declared when no _default present', () => {
    const presets: Record<string, ConfigPreset> = {
      a: { difficulty: 'easy' },
      b: { difficulty: 'hard' },
    };
    const r = resolveConfig({ presets, schema: SIMPLE_SCHEMA, attrValue: null });
    expect(r.resolved?.['difficulty']).toBe('easy');
  });
});

describe('resolveConfig — preset name lookup', () => {
  it('matches preset by exact name', () => {
    const r = resolveConfig({ presets: SIMPLE_PRESETS, schema: SIMPLE_SCHEMA, attrValue: 'hard' });
    expect(r.resolved?.['difficulty']).toBe('hard');
  });
  it('unknown preset surfaces issue + cascades to auto', () => {
    const r = resolveConfig({ presets: SIMPLE_PRESETS, schema: SIMPLE_SCHEMA, attrValue: 'lethal' });
    expect(r.issues.some((m) => m.includes('lethal'))).toBe(true);
    expect(r.resolved?.['difficulty']).toBe('medium');
  });
});

describe('resolveConfig — _extends chain', () => {
  it('child wins on key conflict, parent values inherited', () => {
    const presets: Record<string, ConfigPreset> = {
      base: { _default: true, show_high_score: true, difficulty: 'easy' },
      child: { _extends: 'base', difficulty: 'hard' },
    };
    const r = resolveConfig({ presets, schema: SIMPLE_SCHEMA, attrValue: 'child' });
    expect(r.resolved?.['show_high_score']).toBe(true);
    expect(r.resolved?.['difficulty']).toBe('hard');
  });
  it('rejects cycle and cascades to auto', () => {
    const presets: Record<string, ConfigPreset> = {
      a: { _default: true, _extends: 'b', difficulty: 'easy' },
      b: { _extends: 'a', difficulty: 'hard' },
    };
    const r = resolveConfig({ presets, schema: SIMPLE_SCHEMA, attrValue: 'a' });
    expect(r.issues.some((m) => m.includes('circular'))).toBe(true);
  });
  it('rejects depth >8 and cascades to auto', () => {
    const presets: Record<string, ConfigPreset> = {
      base: { _default: true, difficulty: 'easy' },
    };
    for (let i = 0; i <= 9; i += 1) {
      presets[`l${i}`] = { _extends: i === 0 ? 'base' : `l${i - 1}`, difficulty: 'easy' };
    }
    const r = resolveConfig({ presets, schema: SIMPLE_SCHEMA, attrValue: 'l9' });
    expect(r.issues.some((m) => m.includes('depth'))).toBe(true);
  });
  it('missing _extends target surfaces issue + cascades to auto', () => {
    const presets: Record<string, ConfigPreset> = {
      base: { _default: true, difficulty: 'easy' },
      orphan: { _extends: 'nope', difficulty: 'hard' },
    };
    const r = resolveConfig({ presets, schema: SIMPLE_SCHEMA, attrValue: 'orphan' });
    expect(r.issues.some((m) => m.includes('does not match'))).toBe(true);
    expect(r.resolved?.['difficulty']).toBe('easy');
  });
});

describe('resolveConfig — inline JSON', () => {
  it('rejectInlineJson=true emits issue + cascades to auto', () => {
    const r = resolveConfig({
      presets: SIMPLE_PRESETS,
      schema: SIMPLE_SCHEMA,
      attrValue: '{"difficulty":"hard"}',
      rejectInlineJson: true,
    });
    expect(r.issues.some((m) => m.includes('does not accept inline JSON'))).toBe(true);
    expect(r.resolved?.['difficulty']).toBe('medium');
  });
  it('inline with _extends layers atop named target', () => {
    const r = resolveConfig({
      presets: SIMPLE_PRESETS,
      schema: SIMPLE_SCHEMA,
      attrValue: JSON.stringify({ _extends: 'default', difficulty: 'hard' }),
    });
    expect(r.resolved?.['difficulty']).toBe('hard');
    expect(r.resolved?.['show_high_score']).toBe(true);
  });
  it('inline without _extends layers atop auto base', () => {
    const r = resolveConfig({
      presets: SIMPLE_PRESETS,
      schema: SIMPLE_SCHEMA,
      attrValue: JSON.stringify({ difficulty: 'hard' }),
    });
    expect(r.resolved?.['difficulty']).toBe('hard');
    expect(r.resolved?.['show_high_score']).toBe(true);
  });
  it('inline malformed JSON cascades to auto with issue', () => {
    const r = resolveConfig({
      presets: SIMPLE_PRESETS,
      schema: SIMPLE_SCHEMA,
      attrValue: '{not json',
    });
    expect(r.issues.some((m) => m.includes('failed to parse'))).toBe(true);
    expect(r.resolved?.['difficulty']).toBe('medium');
  });
});

describe('resolveConfig — schema-driven validation', () => {
  it('drops key on invalid value + emits issue', () => {
    const presets: Record<string, ConfigPreset> = {
      default: { _default: true, difficulty: 'extreme', show_high_score: true },
    };
    const r = resolveConfig({ presets, schema: SIMPLE_SCHEMA, attrValue: 'default' });
    expect(r.resolved?.['difficulty']).toBeUndefined();
    expect(r.resolved?.['show_high_score']).toBe(true);
    expect(r.issues.some((m) => m.includes('difficulty'))).toBe(true);
  });
  it('passes typed primitives through (boolean, number)', () => {
    const presets: Record<string, ConfigPreset> = {
      default: { _default: true, enabled: true, peek: 1.5, label: 'go', mode: 'a' },
    };
    const schema: Record<string, ConfigSchemaEntry> = {
      enabled: 'boolean',
      peek: { type: 'range', min: 0, max: 5 },
      label: 'string',
      mode: ['a', 'b'],
    };
    const r = resolveConfig({ presets, schema, attrValue: 'default' });
    expect(r.resolved?.['enabled']).toBe(true);
    expect(r.resolved?.['peek']).toBe(1.5);
    expect(r.resolved?.['label']).toBe('go');
    expect(r.resolved?.['mode']).toBe('a');
  });
  it('schema omitted -> values pass through unvalidated', () => {
    const presets: Record<string, ConfigPreset> = {
      default: { _default: true, anything: 'whatever', count: 42, flag: false },
    };
    const r = resolveConfig({ presets, attrValue: 'default' });
    expect(r.resolved?.['anything']).toBe('whatever');
    expect(r.resolved?.['count']).toBe(42);
    expect(r.resolved?.['flag']).toBe(false);
  });
  it('inline invalid override -> drops the override + keeps base value', () => {
    const r = resolveConfig({
      presets: SIMPLE_PRESETS,
      schema: SIMPLE_SCHEMA,
      attrValue: JSON.stringify({ difficulty: 'extreme' }),
    });
    expect(r.issues.some((m) => m.includes('inline'))).toBe(true);
    expect(r.resolved?.['difficulty']).toBe('medium');
  });
});
