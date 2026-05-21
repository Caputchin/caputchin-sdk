import { describe, it, expect } from 'vitest';
import { applySkinVars } from '../../../src/skin/css-vars.js';

describe('applySkinVars', () => {
  it('writes each palette key as a `--cpt-skin-<key>` custom property on the host element', () => {
    const host = document.createElement('div');
    applySkinVars(host, { primary: '#abc', surface_bg: '#fff' });
    expect(host.style.getPropertyValue('--cpt-skin-primary')).toBe('#abc');
    expect(host.style.getPropertyValue('--cpt-skin-surface_bg')).toBe('#fff');
  });

  it('writes to the shadow root host when given a ShadowRoot', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    applySkinVars(shadow, { primary: '#123' });
    // Vars land on the host element (the `:host` style binding context),
    // not the shadow root itself.
    expect(host.style.getPropertyValue('--cpt-skin-primary')).toBe('#123');
    host.remove();
  });

  it('is idempotent: re-applying overwrites prior values', () => {
    const host = document.createElement('div');
    applySkinVars(host, { primary: '#aaa' });
    applySkinVars(host, { primary: '#bbb' });
    expect(host.style.getPropertyValue('--cpt-skin-primary')).toBe('#bbb');
  });

  it('writes nothing when palette is empty (no thrown error)', () => {
    const host = document.createElement('div');
    expect(() => applySkinVars(host, {})).not.toThrow();
    expect(host.style.length).toBe(0);
  });
});
