import { describe, it, expect } from 'vitest';
import { inspectWidgetConfig } from '../../src/config/widget';
import { inspectGameConfig } from '../../src/config/game';

function el(attrs: Record<string, string>): HTMLElement {
  const e = document.createElement('div');
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

describe('inspectWidgetConfig — defaults', () => {
  it('defaults mode to "simple"', () => {
    const r = inspectWidgetConfig(el({ sitekey: 'k' }));
    expect(r.config.mode).toBe('simple');
    expect(r.config.trigger).toBe('auto');
    expect(r.issues).toEqual([]);
    expect(r.inert).toBe(false);
  });

  it('reads explicit mode + trigger', () => {
    const r = inspectWidgetConfig(el({ sitekey: 'k', mode: 'invisible', trigger: 'form-submit' }));
    expect(r.config.mode).toBe('invisible');
    expect(r.config.trigger).toBe('form-submit');
    expect(r.issues).toEqual([]);
  });
});

describe('inspectWidgetConfig — mode validation', () => {
  it('falls back to simple on unknown mode + emits issue', () => {
    const r = inspectWidgetConfig(el({ sitekey: 'k', mode: 'bogus' }));
    expect(r.config.mode).toBe('simple');
    expect(r.issues[0]!.message).toContain('mode="bogus"');
  });

  it('rejects mode="game" (game widget territory) + emits issue', () => {
    const r = inspectWidgetConfig(el({ sitekey: 'k', mode: 'game' }));
    expect(r.config.mode).toBe('simple');
    expect(r.issues[0]!.message).toContain('mode="game"');
  });
});

describe('inspectWidgetConfig — trigger × mode coercion', () => {
  it('coerces invisible+click → invisible+auto + emits issue', () => {
    const r = inspectWidgetConfig(el({ sitekey: 'k', mode: 'invisible', trigger: 'click' }));
    expect(r.config.trigger).toBe('auto');
    expect(r.issues.some((i) => i.message.includes('trigger="click"') && i.message.includes('mode="invisible"'))).toBe(true);
  });
});

describe('inspectWidgetConfig — sitekey rules', () => {
  it('marks inert + emits issue when sitekey missing', () => {
    const r = inspectWidgetConfig(el({ mode: 'simple' }));
    expect(r.inert).toBe(true);
    expect(r.issues.some((i) => i.message.includes('sitekey'))).toBe(true);
  });
});

describe('inspectWidgetConfig — size + width', () => {
  it('defaults size=normal width=auto', () => {
    const r = inspectWidgetConfig(el({ sitekey: 'k' }));
    expect(r.config.size).toBe('normal');
    expect(r.config.width).toBe('auto');
  });

  it('accepts compact + full', () => {
    const r = inspectWidgetConfig(el({ sitekey: 'k', size: 'compact', width: 'full' }));
    expect(r.config.size).toBe('compact');
    expect(r.config.width).toBe('full');
    expect(r.issues).toEqual([]);
  });

  it('accepts width=<pixels>', () => {
    const r = inspectWidgetConfig(el({ sitekey: 'k', width: '500' }));
    expect(r.config.width).toBe(500);
  });

  it('falls back to auto on bogus width + emits issue', () => {
    const r = inspectWidgetConfig(el({ sitekey: 'k', width: 'bogus' }));
    expect(r.config.width).toBe('auto');
    expect(r.issues.some((i) => i.message.includes('width="bogus"'))).toBe(true);
  });
});

describe('inspectGameConfig — sitekey-optional', () => {
  it('null sitekey when absent (game-only path)', () => {
    const r = inspectGameConfig(el({ game: '@x/y' }));
    expect(r.config.sitekey).toBeNull();
    expect(r.inert).toBe(false);
    expect(r.issues).toEqual([]);
  });

  it('reads sitekey when present (play+verify path)', () => {
    const r = inspectGameConfig(el({ sitekey: 'k', game: '@x/y' }));
    expect(r.config.sitekey).toBe('k');
    expect(r.inert).toBe(false);
  });

  it('never marks inert', () => {
    const r = inspectGameConfig(el({}));
    expect(r.inert).toBe(false);
  });
});

describe('inspectGameConfig — layout', () => {
  it('defaults layout=auto', () => {
    const r = inspectGameConfig(el({ game: '@x/y' }));
    expect(r.config.layout).toBe('auto');
  });

  it('accepts inline|modal|fullscreen', () => {
    expect(inspectGameConfig(el({ game: '@x/y', layout: 'inline' })).config.layout).toBe('inline');
    expect(inspectGameConfig(el({ game: '@x/y', layout: 'modal' })).config.layout).toBe('modal');
    expect(inspectGameConfig(el({ game: '@x/y', layout: 'fullscreen' })).config.layout).toBe('fullscreen');
  });

  it('falls back to auto on bogus + emits issue', () => {
    const r = inspectGameConfig(el({ game: '@x/y', layout: 'bogus' }));
    expect(r.config.layout).toBe('auto');
    expect(r.issues.some((i) => i.message.includes('layout="bogus"'))).toBe(true);
  });
});

describe('inspectGameConfig — game-src validation', () => {
  it('strips javascript: scheme + emits issue', () => {
    const r = inspectGameConfig(el({ sitekey: 'k', 'game-src': 'javascript:alert(1)' }));
    expect(r.config.gameSrc).toBeNull();
    expect(r.issues.some((i) => i.message.includes('blocked scheme'))).toBe(true);
  });

  it('accepts https URL', () => {
    const r = inspectGameConfig(el({ sitekey: 'k', 'game-src': 'https://example.com/g.js' }));
    expect(r.config.gameSrc).toBe('https://example.com/g.js');
    expect(r.issues).toEqual([]);
  });
});

describe('inspectGameConfig — height attr', () => {
  it('defaults to null (auto)', () => {
    const r = inspectGameConfig(el({ game: '@x/y' }));
    expect(r.config.height).toBeNull();
  });

  it('accepts pixel value', () => {
    const r = inspectGameConfig(el({ game: '@x/y', height: '300' })).config.height;
    expect(r).toBe(300);
  });

  it('ignores bogus value + emits issue', () => {
    const r = inspectGameConfig(el({ game: '@x/y', height: 'bogus' }));
    expect(r.config.height).toBeNull();
    expect(r.issues.some((i) => i.message.includes('height="bogus"'))).toBe(true);
  });
});
