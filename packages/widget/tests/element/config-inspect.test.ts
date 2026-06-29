import { describe, it, expect } from 'vitest';
import { inspectWidgetConfig } from '../../src/config/widget';
import { inspectGameConfig, shouldVerify } from '../../src/config/game';

function el(attrs: Record<string, string>): HTMLElement {
  const e = document.createElement('div');
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

describe('inspectWidgetConfig - defaults', () => {
  it('defaults to visible (invisible=false)', () => {
    const r = inspectWidgetConfig(el({ sitekey: 'k' }));
    expect(r.config.invisible).toBe(false);
    expect(r.config.trigger).toBe('auto');
    expect(r.issues).toEqual([]);
    expect(r.inert).toBe(false);
  });

  it('reads invisible boolean + trigger', () => {
    const r = inspectWidgetConfig(el({ sitekey: 'k', invisible: '', trigger: 'form-submit' }));
    expect(r.config.invisible).toBe(true);
    expect(r.config.trigger).toBe('form-submit');
    expect(r.issues).toEqual([]);
  });
});

describe('inspectWidgetConfig - trigger × invisible coercion', () => {
  it('coerces invisible+click → invisible+auto + emits issue', () => {
    const r = inspectWidgetConfig(el({ sitekey: 'k', invisible: '', trigger: 'click' }));
    expect(r.config.trigger).toBe('auto');
    expect(r.issues.some((i) => i.message.includes('trigger="click"') && i.message.includes('invisible'))).toBe(true);
  });
});

describe('inspectWidgetConfig - sitekey rules', () => {
  it('marks inert + emits issue when sitekey missing', () => {
    const r = inspectWidgetConfig(el({}));
    expect(r.inert).toBe(true);
    expect(r.issues.some((i) => i.message.includes('sitekey'))).toBe(true);
  });
});

describe('inspectWidgetConfig - size + width', () => {
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

describe('inspectGameConfig - sitekey-optional', () => {
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

describe('inspectGameConfig - no-verify / shouldVerify', () => {
  it('noVerify is false by default', () => {
    expect(inspectGameConfig(el({ sitekey: 'k', game: '@x/y' })).config.noVerify).toBe(false);
  });

  it('boolean `no-verify` attribute sets noVerify true (presence, value-agnostic)', () => {
    expect(inspectGameConfig(el({ sitekey: 'k', game: '@x/y', 'no-verify': '' })).config.noVerify).toBe(true);
  });

  it('shouldVerify: sitekey + no no-verify → true (the gate runs)', () => {
    expect(shouldVerify(inspectGameConfig(el({ sitekey: 'k', game: '@x/y' })).config)).toBe(true);
  });

  it('shouldVerify: sitekey + no-verify → false (overrides still fetched, gate skipped)', () => {
    expect(shouldVerify(inspectGameConfig(el({ sitekey: 'k', game: '@x/y', 'no-verify': '' })).config)).toBe(false);
  });

  it('shouldVerify: no sitekey → false regardless of no-verify (nothing to verify against)', () => {
    expect(shouldVerify(inspectGameConfig(el({ game: '@x/y' })).config)).toBe(false);
    expect(shouldVerify(inspectGameConfig(el({ game: '@x/y', 'no-verify': '' })).config)).toBe(false);
  });
});

describe('inspectGameConfig - layout', () => {
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

describe('inspectGameConfig - game-src validation', () => {
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

describe('inspectGameConfig - height attr', () => {
  it('defaults to null (auto)', () => {
    const r = inspectGameConfig(el({ game: '@x/y' }));
    expect(r.config.height).toBeNull();
  });

  it('accepts pixel value', () => {
    const r = inspectGameConfig(el({ game: '@x/y', height: '300' })).config.height;
    expect(r).toBe(300);
  });

  it('accepts "full"', () => {
    const r = inspectGameConfig(el({ game: '@x/y', height: 'full' })).config.height;
    expect(r).toBe('full');
  });

  it('ignores bogus value + emits issue', () => {
    const r = inspectGameConfig(el({ game: '@x/y', height: 'bogus' }));
    expect(r.config.height).toBeNull();
    expect(r.issues.some((i) => i.message.includes('height="bogus"'))).toBe(true);
  });
});

describe('inspectGameConfig - overlay-width / overlay-height attrs', () => {
  it('default to auto / null', () => {
    const r = inspectGameConfig(el({ game: '@x/y' }));
    expect(r.config.overlayWidth).toBe('auto');
    expect(r.config.overlayHeight).toBeNull();
  });

  it('accept full', () => {
    const r = inspectGameConfig(el({ game: '@x/y', 'overlay-width': 'full', 'overlay-height': 'full' })).config;
    expect(r.overlayWidth).toBe('full');
    expect(r.overlayHeight).toBe('full');
  });

  it('accept pixel values', () => {
    const r = inspectGameConfig(el({ game: '@x/y', 'overlay-width': '900', 'overlay-height': '600' })).config;
    expect(r.overlayWidth).toBe(900);
    expect(r.overlayHeight).toBe(600);
  });

  it('emit a labelled issue on bogus overlay-width (falls back to auto)', () => {
    const r = inspectGameConfig(el({ game: '@x/y', 'overlay-width': 'bogus' }));
    expect(r.config.overlayWidth).toBe('auto');
    expect(r.issues.some((i) => i.message.includes('overlay-width="bogus"'))).toBe(true);
  });

  it('emit a labelled issue on bogus overlay-height (ignored, stays null)', () => {
    const r = inspectGameConfig(el({ game: '@x/y', 'overlay-height': 'bogus' }));
    expect(r.config.overlayHeight).toBeNull();
    expect(r.issues.some((i) => i.message.includes('overlay-height="bogus"'))).toBe(true);
  });
});

describe('inspectGameConfig - lang attr', () => {
  it('defaults to null when omitted', () => {
    const r = inspectGameConfig(el({ game: '@x/y' }));
    expect(r.config.locale).toBeNull();
  });

  it('reads a preset name', () => {
    expect(inspectGameConfig(el({ game: '@x/y', locale: 'ar' })).config.locale).toBe('ar');
  });

  it('reads inline JSON unchanged', () => {
    const r = inspectGameConfig(el({ game: '@x/y', locale: '{"_lang":"ar"}' }));
    expect(r.config.locale).toBe('{"_lang":"ar"}');
  });

  it('treats whitespace-only value as null', () => {
    const r = inspectGameConfig(el({ game: '@x/y', locale: '   ' }));
    expect(r.config.locale).toBeNull();
  });
});
