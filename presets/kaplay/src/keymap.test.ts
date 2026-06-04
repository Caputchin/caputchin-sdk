import { describe, it, expect } from 'vitest';
import { domKeyToKaplay } from './keymap';

// The ground truth: KAPLAY's own DOM-key normalization, transcribed verbatim from
// the pinned kaplay@3001 build's `Me.keydown` handler:
//   let Eo = { ArrowLeft:"left", ArrowRight:"right", ArrowUp:"up", ArrowDown:"down", " ":"space" };
//   let name = Eo[f.key] || f.key.toLowerCase();
// `domKeyToKaplay` must equal this for every key, so a key bound through the live
// iframe-document listener fires the action KAPLAY's canvas listener would have.
const KAPLAY_EO: Record<string, string> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ' ': 'space',
};
const kaplayNormalize = (key: string): string => KAPLAY_EO[key] ?? key.toLowerCase();

describe('domKeyToKaplay', () => {
  it('maps the arrow keys and space to KAPLAY names', () => {
    expect(domKeyToKaplay('ArrowLeft')).toBe('left');
    expect(domKeyToKaplay('ArrowRight')).toBe('right');
    expect(domKeyToKaplay('ArrowUp')).toBe('up');
    expect(domKeyToKaplay('ArrowDown')).toBe('down');
    expect(domKeyToKaplay(' ')).toBe('space');
  });

  it('lower-cases letters (shift-independent)', () => {
    expect(domKeyToKaplay('a')).toBe('a');
    expect(domKeyToKaplay('A')).toBe('a');
    expect(domKeyToKaplay('W')).toBe('w');
    expect(domKeyToKaplay('Z')).toBe('z');
  });

  it('passes named keys through as their lower-cased DOM name', () => {
    // KAPLAY has no special table entry for these - they ARE key.toLowerCase().
    expect(domKeyToKaplay('Enter')).toBe('enter');
    expect(domKeyToKaplay('Escape')).toBe('escape');
    expect(domKeyToKaplay('Tab')).toBe('tab');
    expect(domKeyToKaplay('Backspace')).toBe('backspace');
    expect(domKeyToKaplay('Shift')).toBe('shift');
  });

  it('keeps punctuation as the literal character (KAPLAY uses "-", not "minus")', () => {
    for (const k of ['-', '=', '+', '[', ']', '\\', '`', ',', '.', '/', ';', "'"]) {
      expect(domKeyToKaplay(k)).toBe(k);
    }
  });

  it('matches KAPLAY normalization exactly across the realistic key surface', () => {
    const vectors = [
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ',
      'a', 'A', 'w', 'd', 's', 'x', 'z',
      '0', '1', '9',
      'Enter', 'Escape', 'Tab', 'Backspace', 'Shift', 'Control', 'Alt', 'Meta',
      '-', '=', '+', '[', ']', '\\', '`',
      'F1', 'F12',
    ];
    for (const k of vectors) {
      expect(domKeyToKaplay(k), `key ${JSON.stringify(k)}`).toBe(kaplayNormalize(k));
    }
  });
});
