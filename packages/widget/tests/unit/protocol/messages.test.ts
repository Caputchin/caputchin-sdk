import { describe, it, expect } from 'vitest';
import { isIframeToWidget } from '../../../src/protocol/messages.js';

describe('isIframeToWidget', () => {
  it('accepts game-started', () => expect(isIframeToWidget({ kind: 'game-started', seq: 1 })).toBe(true));
  it('accepts game-pass', () => expect(isIframeToWidget({ kind: 'game-pass', seq: 2, score: 100, durationMs: 5000 })).toBe(true));
  it('accepts game-error', () => expect(isIframeToWidget({ kind: 'game-error', seq: 3, code: 'e', message: 'm' })).toBe(true));
  it('accepts manifest', () => expect(isIframeToWidget({ kind: 'manifest', seq: 0, gameId: 'g', preferredLayout: 'modal', preferredWidth: null, preferredHeight: null, locales: null })).toBe(true));
  it('accepts manifest with null preferredLayout', () => expect(isIframeToWidget({ kind: 'manifest', seq: 0, gameId: null, preferredLayout: null, preferredWidth: null, preferredHeight: null, locales: null })).toBe(true));
  it('accepts manifest carrying languages.presets', () => expect(isIframeToWidget({ kind: 'manifest', seq: 0, gameId: 'g', preferredLayout: null, preferredWidth: null, preferredHeight: null, locales: { presets: { en: { _lang: 'en', _default: true, hello: 'Hi' } } }, skins: null })).toBe(true));
  it('accepts manifest carrying skins.presets', () => expect(isIframeToWidget({ kind: 'manifest', seq: 0, gameId: 'g', preferredLayout: null, preferredWidth: null, preferredHeight: null, locales: null, skins: { schema: { primary: 'color' }, presets: { light: { _theme: 'light', _default: true, primary: '#fff' } } }, configurations: null })).toBe(true));
  it('accepts manifest carrying configurations.presets', () => expect(isIframeToWidget({ kind: 'manifest', seq: 0, gameId: 'g', preferredLayout: null, preferredWidth: null, preferredHeight: null, locales: null, skins: null, configurations: { schema: { show_high_score: 'boolean' }, presets: { default: { _default: true, show_high_score: true } } } })).toBe(true));
  it('rejects unknown kind', () => expect(isIframeToWidget({ kind: 'kickoff', seq: 1 })).toBe(false));
  it('rejects missing seq', () => expect(isIframeToWidget({ kind: 'game-started' })).toBe(false));
  it('rejects null', () => expect(isIframeToWidget(null)).toBe(false));
  it('rejects primitive', () => expect(isIframeToWidget('game-started')).toBe(false));
  it('rejects missing kind', () => expect(isIframeToWidget({ seq: 1 })).toBe(false));
});
