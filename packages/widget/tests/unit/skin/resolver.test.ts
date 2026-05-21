import { describe, it, expect } from 'vitest';
import type { SkinPreset, SkinSchemaEntry } from '@caputchin/game-sdk';
import { resolveSkin } from '../../../src/skin/resolver.js';

const PRESETS_LIGHT_DARK: Record<string, SkinPreset> = {
  light: { _mode: 'light', _default: true, primary: '#2F6640', surface_bg: '#ffffff' },
  dark: { _mode: 'dark', _default: true, primary: '#4E9B65', surface_bg: '#182518' },
};

const SCHEMA_COLORS: Record<string, SkinSchemaEntry> = {
  primary: 'color',
  surface_bg: { type: 'color', name: 'Surface', description: 'main bg' },
};

describe('resolveSkin — basic cascade', () => {
  it('empty presets returns null', () => {
    const r = resolveSkin({}, SCHEMA_COLORS, 'light', false);
    expect(r.resolved).toBeNull();
  });

  it('attr="light" picks light preset', () => {
    const r = resolveSkin(PRESETS_LIGHT_DARK, SCHEMA_COLORS, 'light', false);
    expect(r.resolved?._mode).toBe('light');
    expect(r.resolved?.['primary']).toBe('#2F6640');
  });

  it('attr="dark" picks dark preset', () => {
    const r = resolveSkin(PRESETS_LIGHT_DARK, SCHEMA_COLORS, 'dark', false);
    expect(r.resolved?._mode).toBe('dark');
    expect(r.resolved?.['surface_bg']).toBe('#182518');
  });

  it('attr="auto" + prefersDark=false → light', () => {
    const r = resolveSkin(PRESETS_LIGHT_DARK, SCHEMA_COLORS, 'auto', false);
    expect(r.resolved?._mode).toBe('light');
  });

  it('attr="auto" + prefersDark=true → dark', () => {
    const r = resolveSkin(PRESETS_LIGHT_DARK, SCHEMA_COLORS, 'auto', true);
    expect(r.resolved?._mode).toBe('dark');
  });

  it('attr=null + prefersDark=true → dark', () => {
    const r = resolveSkin(PRESETS_LIGHT_DARK, SCHEMA_COLORS, null, true);
    expect(r.resolved?._mode).toBe('dark');
  });

  it('attr=empty string + prefersDark=false → light', () => {
    const r = resolveSkin(PRESETS_LIGHT_DARK, SCHEMA_COLORS, '', false);
    expect(r.resolved?._mode).toBe('light');
  });
});

describe('resolveSkin — preset name lookup', () => {
  const presets: Record<string, SkinPreset> = {
    'sun': { _mode: 'light', _default: true, primary: '#fff' },
    'moon': { _mode: 'dark', _default: true, primary: '#000' },
  };
  it('matches preset by exact name', () => {
    const r = resolveSkin(presets, null, 'moon', false);
    expect(r.resolved?._mode).toBe('dark');
    expect(r.resolved?.['primary']).toBe('#000');
  });
  it('unknown preset name surfaces issue + cascades to auto', () => {
    const r = resolveSkin(presets, null, 'unknown', false);
    expect(r.issues.some((m) => m.includes('unknown'))).toBe(true);
    expect(r.resolved?._mode).toBe('light');
  });
});

describe('resolveSkin — mode shortcut tie-break', () => {
  it('mode "light" picks _default:true', () => {
    const presets: Record<string, SkinPreset> = {
      a: { _mode: 'light', primary: '#aaa' },
      b: { _mode: 'light', _default: true, primary: '#bbb' },
    };
    const r = resolveSkin(presets, null, 'light', false);
    expect(r.resolved?.['primary']).toBe('#bbb');
  });
  it('mode "light" with no _default picks first declared in that mode', () => {
    const presets: Record<string, SkinPreset> = {
      first: { _mode: 'light', primary: '#aaa' },
      second: { _mode: 'light', primary: '#bbb' },
    };
    const r = resolveSkin(presets, null, 'light', false);
    expect(r.resolved?.['primary']).toBe('#aaa');
  });
  it('mode "dark" with no dark preset → cascade auto', () => {
    const presets: Record<string, SkinPreset> = {
      light: { _mode: 'light', _default: true, primary: '#fff' },
    };
    const r = resolveSkin(presets, null, 'dark', false);
    expect(r.issues.some((m) => m.includes('_mode=dark'))).toBe(true);
    expect(r.resolved?._mode).toBe('light');
  });
});

describe('resolveSkin — auto cascade', () => {
  it('prefersDark=true with no dark preset falls back to light', () => {
    const presets: Record<string, SkinPreset> = {
      light: { _mode: 'light', _default: true, primary: '#fff' },
    };
    const r = resolveSkin(presets, null, null, true);
    expect(r.resolved?._mode).toBe('light');
  });
  it('falls back to first declared when no mode preset matches', () => {
    const presets: Record<string, SkinPreset> = {
      only: { primary: '#abc' },
    };
    const r = resolveSkin(presets, null, null, false);
    expect(r.resolved?._mode).toBe('light'); // default mode
  });
});

describe('resolveSkin — _extends chain', () => {
  it('extends a preset by name; child wins on key conflict', () => {
    const presets: Record<string, SkinPreset> = {
      base: { _mode: 'dark', _default: true, primary: '#000', accent: '#444' },
      child: { _mode: 'dark', _extends: 'base', primary: '#111' },
    };
    const r = resolveSkin(presets, null, 'child', false);
    expect(r.resolved?.['primary']).toBe('#111');
    expect(r.resolved?.['accent']).toBe('#444');
  });
  it('extends a mode shortcut: _extends: "dark" → that mode\'s _default', () => {
    const presets: Record<string, SkinPreset> = {
      'dark-default': { _mode: 'dark', _default: true, primary: '#000', accent: '#aaa' },
      'red-on-dark': { _mode: 'dark', _extends: 'dark', primary: '#ff0000' },
    };
    const r = resolveSkin(presets, null, 'red-on-dark', false);
    expect(r.resolved?.['primary']).toBe('#ff0000');
    expect(r.resolved?.['accent']).toBe('#aaa');
  });
  it('rejects cycle and cascades to auto', () => {
    const presets: Record<string, SkinPreset> = {
      a: { _mode: 'light', _default: true, _extends: 'b', primary: '#aaa' },
      b: { _mode: 'light', _extends: 'a', primary: '#bbb' },
    };
    const r = resolveSkin(presets, null, 'a', false);
    expect(r.issues.some((m) => m.includes('circular'))).toBe(true);
  });
  it('rejects depth >8 and cascades to auto', () => {
    const presets: Record<string, SkinPreset> = {
      light: { _mode: 'light', _default: true, primary: '#fff' },
    };
    for (let i = 0; i <= 9; i += 1) {
      presets[`l${i}`] = { _mode: 'light', _extends: i === 0 ? 'light' : `l${i - 1}`, primary: `#${i}${i}${i}` };
    }
    const r = resolveSkin(presets, null, 'l9', false);
    expect(r.issues.some((m) => m.includes('depth'))).toBe(true);
  });
  it('extends missing target surfaces issue + cascades to auto', () => {
    const presets: Record<string, SkinPreset> = {
      light: { _mode: 'light', _default: true, primary: '#fff' },
      orphan: { _mode: 'light', _extends: 'nope', primary: '#000' },
    };
    const r = resolveSkin(presets, null, 'orphan', false);
    expect(r.issues.some((m) => m.includes('does not match'))).toBe(true);
    expect(r.resolved?._mode).toBe('light');
  });
});

describe('resolveSkin — inline JSON', () => {
  it('rejectInlineJson=true emits issue + cascades to auto', () => {
    const r = resolveSkin(PRESETS_LIGHT_DARK, SCHEMA_COLORS, '{"_mode":"dark"}', false, { rejectInlineJson: true });
    expect(r.issues.some((m) => m.includes('does not accept inline JSON'))).toBe(true);
    expect(r.resolved?._mode).toBe('light');
  });
  it('inline with _extends targets preset name', () => {
    const r = resolveSkin(
      PRESETS_LIGHT_DARK,
      SCHEMA_COLORS,
      JSON.stringify({ _extends: 'dark', primary: '#ff0000' }),
      false,
    );
    expect(r.resolved?._mode).toBe('dark');
    expect(r.resolved?.['primary']).toBe('#ff0000');
    expect(r.resolved?.['surface_bg']).toBe('#182518');
  });
  it('inline with _extends targets mode shortcut', () => {
    const r = resolveSkin(
      PRESETS_LIGHT_DARK,
      SCHEMA_COLORS,
      JSON.stringify({ _extends: 'light', primary: '#abcdef' }),
      false,
    );
    expect(r.resolved?._mode).toBe('light');
    expect(r.resolved?.['primary']).toBe('#abcdef');
  });
  it('inline _mode drives base selection (no light/dark mismatch)', () => {
    // Inline _mode='dark' on a system with prefersDark=false: the BASE
    // should resolve to dark too so surface_bg + primary etc. match the
    // declared mode. Inline override (primary:'#abc') wins atop.
    const r = resolveSkin(
      PRESETS_LIGHT_DARK,
      SCHEMA_COLORS,
      JSON.stringify({ _mode: 'dark', primary: '#abc' }),
      false,
    );
    expect(r.resolved?._mode).toBe('dark');
    expect(r.resolved?.['primary']).toBe('#abc'); // inline wins
    expect(r.resolved?.['surface_bg']).toBe('#182518'); // dark base, NOT light
  });
  it('inline _mode="light" on prefersDark=true forces light base', () => {
    const r = resolveSkin(
      PRESETS_LIGHT_DARK,
      SCHEMA_COLORS,
      JSON.stringify({ _mode: 'light', primary: '#abc' }),
      true,
    );
    expect(r.resolved?._mode).toBe('light');
    expect(r.resolved?.['surface_bg']).toBe('#ffffff'); // light base, NOT dark
  });
  it('inline without _mode falls back to system prefersDark for base', () => {
    const r = resolveSkin(
      PRESETS_LIGHT_DARK,
      SCHEMA_COLORS,
      JSON.stringify({ primary: '#abc' }),
      true,
    );
    expect(r.resolved?._mode).toBe('dark'); // from auto base
    expect(r.resolved?.['surface_bg']).toBe('#182518');
  });
  it('inline malformed JSON cascades to auto with issue', () => {
    const r = resolveSkin(PRESETS_LIGHT_DARK, SCHEMA_COLORS, '{not json', false);
    expect(r.issues.some((m) => m.includes('failed to parse'))).toBe(true);
    expect(r.resolved?._mode).toBe('light');
  });
  it('inline non-object JSON (array) emits issue', () => {
    const r = resolveSkin(PRESETS_LIGHT_DARK, SCHEMA_COLORS, '[1,2,3]', false);
    // Array starts with '[', not '{', so falls through to preset-name lookup
    // (unknown). The cascade path is the unknown-value branch.
    expect(r.issues.some((m) => m.includes('did not match'))).toBe(true);
  });
});

describe('resolveSkin — schema-driven validation', () => {
  it('drops key on invalid color value + emits issue', () => {
    const presets: Record<string, SkinPreset> = {
      light: { _mode: 'light', _default: true, primary: '#zzz', accent: '#fff' },
    };
    const r = resolveSkin(presets, SCHEMA_COLORS, 'light', false);
    expect(r.resolved?.['primary']).toBeUndefined();
    expect(r.issues.some((m) => m.includes('primary') && m.includes('rejected'))).toBe(true);
  });
  it('drops invalid image asset + emits issue', () => {
    const presets: Record<string, SkinPreset> = {
      light: { _mode: 'light', _default: true, leaf: 'https://x.com/leaf.bmp' },
    };
    const schema: Record<string, SkinSchemaEntry> = { leaf: 'image' };
    const r = resolveSkin(presets, schema, 'light', false);
    expect(r.resolved?.['leaf']).toBeUndefined();
    expect(r.issues.some((m) => m.includes('.bmp'))).toBe(true);
  });
  it('resolves bundle-relative image path against baseUrl', () => {
    const presets: Record<string, SkinPreset> = {
      light: { _mode: 'light', _default: true, leaf: '/leaf.png' },
    };
    const schema: Record<string, SkinSchemaEntry> = { leaf: 'image' };
    const r = resolveSkin(presets, schema, 'light', false, { baseUrl: 'https://unpkg.com/@x/pkg@1.0.0/' });
    expect(r.resolved?.['leaf']).toBe('https://unpkg.com/leaf.png');
  });
  it('passes data: image URI through after validation', () => {
    const presets: Record<string, SkinPreset> = {
      light: { _mode: 'light', _default: true, leaf: 'data:image/png;base64,abc' },
    };
    const schema: Record<string, SkinSchemaEntry> = { leaf: 'image' };
    const r = resolveSkin(presets, schema, 'light', false);
    expect(r.resolved?.['leaf']).toBe('data:image/png;base64,abc');
  });
  it('schema omitted → values pass through unvalidated', () => {
    const presets: Record<string, SkinPreset> = {
      light: { _mode: 'light', _default: true, anything: 'whatever' },
    };
    const r = resolveSkin(presets, null, 'light', false);
    expect(r.resolved?.['anything']).toBe('whatever');
  });
  it('inline override invalid → drops the override + emits issue + keeps base value', () => {
    const r = resolveSkin(
      PRESETS_LIGHT_DARK,
      SCHEMA_COLORS,
      JSON.stringify({ _mode: 'dark', primary: '#zzz' }),
      false,
    );
    expect(r.issues.some((m) => m.includes('inline'))).toBe(true);
    // Inline _mode='dark' drives base to dark; invalid override dropped;
    // dark preset's primary survives.
    expect(r.resolved?.['primary']).toBe('#4E9B65');
    expect(r.resolved?._mode).toBe('dark');
  });
});
