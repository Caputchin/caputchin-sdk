import { describe, it, expect } from 'vitest';
import { inspectConfig } from '../../src/config';

function el(attrs: Record<string, string>): HTMLElement {
  const e = document.createElement('div');
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

describe('inspectConfig — graceful defaults', () => {
  it('defaults mode to "simple"', () => {
    const r = inspectConfig(el({ sitekey: 'k' }));
    expect(r.config.mode).toBe('simple');
    expect(r.config.trigger).toBe('auto');
    expect(r.issues).toEqual([]);
    expect(r.inert).toBe(false);
  });

  it('reads explicit mode + trigger', () => {
    const r = inspectConfig(el({ sitekey: 'k', mode: 'invisible', trigger: 'form-submit' }));
    expect(r.config.mode).toBe('invisible');
    expect(r.config.trigger).toBe('form-submit');
    expect(r.issues).toEqual([]);
  });
});

describe('inspectConfig — mode validation', () => {
  it('falls back to simple on unknown mode + emits issue', () => {
    const r = inspectConfig(el({ sitekey: 'k', mode: 'bogus' }));
    expect(r.config.mode).toBe('simple');
    expect(r.issues[0]!.message).toContain('mode="bogus"');
  });
});

describe('inspectConfig — trigger × mode coercion', () => {
  it('coerces invisible+click → invisible+auto + emits issue', () => {
    const r = inspectConfig(el({ sitekey: 'k', mode: 'invisible', trigger: 'click' }));
    expect(r.config.trigger).toBe('auto');
    expect(r.issues.some((i) => i.message.includes('trigger="click"') && i.message.includes('mode="invisible"'))).toBe(true);
  });

  it('strips trigger on game-only + emits issue', () => {
    const r = inspectConfig(el({ mode: 'game-only', game: '@x/y', trigger: 'manual' }));
    expect(r.config.trigger).toBe('auto');
    expect(r.issues.some((i) => i.message.includes('game-only'))).toBe(true);
  });
});

describe('inspectConfig — game attrs gating', () => {
  it('strips game attrs on invisible + emits issue', () => {
    const r = inspectConfig(el({ sitekey: 'k', mode: 'invisible', game: '@x/y' }));
    expect(r.config.game).toBeNull();
    expect(r.issues.some((i) => i.message.includes('game') && i.message.includes('invisible'))).toBe(true);
  });

  it('keeps game attrs on game mode', () => {
    const r = inspectConfig(el({ sitekey: 'k', mode: 'game', game: '@x/y' }));
    expect(r.config.game).toBe('@x/y');
    expect(r.issues).toEqual([]);
  });
});

describe('inspectConfig — layout gating', () => {
  it('strips layout on simple + emits issue', () => {
    const r = inspectConfig(el({ sitekey: 'k', mode: 'simple', layout: 'modal' }));
    expect(r.config.layout).toBeNull();
    expect(r.issues.some((i) => i.message.includes('layout') && i.message.includes('simple'))).toBe(true);
  });

  it('keeps layout on game mode', () => {
    const r = inspectConfig(el({ sitekey: 'k', mode: 'game', game: '@x/y', layout: 'modal' }));
    expect(r.config.layout).toBe('modal');
    expect(r.issues).toEqual([]);
  });

  it('emits issue on unknown layout value', () => {
    const r = inspectConfig(el({ sitekey: 'k', mode: 'game', game: '@x/y', layout: 'bogus' }));
    expect(r.config.layout).toBeNull();
    expect(r.issues.some((i) => i.message.includes('layout="bogus"'))).toBe(true);
  });
});

describe('inspectConfig — sitekey rules', () => {
  it('marks inert + emits issue when sitekey missing in verification mode', () => {
    const r = inspectConfig(el({ mode: 'simple' }));
    expect(r.inert).toBe(true);
    expect(r.issues.some((i) => i.message.includes('sitekey'))).toBe(true);
  });

  it('does not mark inert when sitekey missing in game-only mode', () => {
    const r = inspectConfig(el({ mode: 'game-only', game: '@x/y' }));
    expect(r.inert).toBe(false);
    expect(r.issues).toEqual([]);
  });

  it('emits issue when sitekey present with game-only', () => {
    const r = inspectConfig(el({ sitekey: 'k', mode: 'game-only', game: '@x/y' }));
    expect(r.inert).toBe(false);
    expect(r.issues.some((i) => i.message.includes('sitekey') && i.message.includes('game-only'))).toBe(true);
  });
});

describe('inspectConfig — game-src validation', () => {
  it('strips invalid game-src URL + emits issue', () => {
    const r = inspectConfig(el({ sitekey: 'k', mode: 'game', game: 'gid', 'game-src': 'javascript:alert(1)' }));
    expect(r.config.gameSrc).toBeNull();
    expect(r.issues.some((i) => i.message.includes('blocked scheme'))).toBe(true);
  });

  it('accepts https game-src', () => {
    const r = inspectConfig(el({ sitekey: 'k', mode: 'game', game: 'gid', 'game-src': 'https://example.com/g.js' }));
    expect(r.config.gameSrc).toBe('https://example.com/g.js');
    expect(r.issues).toEqual([]);
  });
});
