import { describe, it, expect } from 'vitest';

import {
  emitStart,
  emitPass,
  emitDialogShown,
  emitDialogHidden,
} from '../../../src/verify/events.js';

// The four customer-facing CustomEvents must escape the shadow root, so each
// is asserted to be bubbling + composed and to carry the documented detail.

function capture(el: HTMLElement, type: string): { last: () => CustomEvent | null } {
  let last: CustomEvent | null = null;
  el.addEventListener(type, (e) => { last = e as CustomEvent; });
  return { last: () => last };
}

describe('verify/events emitters', () => {
  it('emitStart carries gameId and is bubbling + composed', () => {
    const el = document.createElement('div');
    const cap = capture(el, 'start');
    emitStart(el, 'memory');
    const ev = cap.last()!;
    expect(ev).not.toBeNull();
    expect(ev.detail).toEqual({ gameId: 'memory' });
    expect(ev.bubbles).toBe(true);
    expect(ev.composed).toBe(true);
  });

  it('emitStart forwards a null gameId untouched', () => {
    const el = document.createElement('div');
    const cap = capture(el, 'start');
    emitStart(el, null);
    expect(cap.last()!.detail).toEqual({ gameId: null });
  });

  it('emitPass forwards the full token/score/duration detail', () => {
    const el = document.createElement('div');
    const cap = capture(el, 'pass');
    const detail = { token: 'tok', score: 42, durationMs: 1234 };
    emitPass(el, detail);
    expect(cap.last()!.detail).toEqual(detail);
    expect(cap.last()!.composed).toBe(true);
  });

  it('emitDialogShown / emitDialogHidden carry the layout', () => {
    const el = document.createElement('div');
    const shown = capture(el, 'dialog-shown');
    const hidden = capture(el, 'dialog-hidden');
    emitDialogShown(el, 'modal');
    emitDialogHidden(el, 'fullscreen');
    expect(shown.last()!.detail).toEqual({ layout: 'modal' });
    expect(hidden.last()!.detail).toEqual({ layout: 'fullscreen' });
  });
});
