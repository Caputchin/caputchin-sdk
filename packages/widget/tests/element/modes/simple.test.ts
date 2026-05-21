import { describe, it, expect } from 'vitest';
import { getWidget } from '../../fixtures/test-element';

declare global {
  var __CAPUTCHIN_API_HOST__: string;
}
(globalThis as unknown as { __CAPUTCHIN_API_HOST__: string }).__CAPUTCHIN_API_HOST__ = 'https://api.test.com';

describe('visible (default) widget presentation', () => {
  it('renders a checkbox with Caputchin branding on mount (inside shadow root)', () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click' });
    document.body.appendChild(el);
    const shadow = el.shadowRoot;
    expect(shadow).not.toBeNull();
    const checkbox = shadow!.querySelector('[role="checkbox"]');
    expect(checkbox).not.toBeNull();
    expect(shadow!.textContent).toContain('Caputchin');
    expect(shadow!.textContent).toContain('see no data');
    // State text replaces the old "I'm not a robot" label. Idle = "Verify".
    expect(shadow!.textContent).toContain('Verify');
    // Light-DOM children stay empty — internals are isolated.
    expect(el.querySelector('[role="checkbox"]')).toBeNull();
    el.remove();
  });

  it('removes the checkbox on disconnect', () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click' });
    document.body.appendChild(el);
    expect(el.shadowRoot!.querySelector('[role="checkbox"]')).not.toBeNull();
    el.remove();
    expect(el.shadowRoot!.querySelector('[role="checkbox"]')).toBeNull();
  });
});

describe('invisible widget presentation', () => {
  it('renders no DOM', () => {
    const el = getWidget({ sitekey: 'k', invisible: '' });
    document.body.appendChild(el);
    expect(el.children.length).toBe(0);
    expect(el.textContent?.trim()).toBe('');
    el.remove();
  });
});

describe('widget lang attribute', () => {
  it('lang="ar" flips shell to arabic strings + dir="rtl"', () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click', lang: 'ar' });
    document.body.appendChild(el);
    expect(el.getAttribute('dir')).toBe('rtl');
    const text = el.shadowRoot!.textContent ?? '';
    expect(text).toContain('تحقق'); // Verify
    expect(text).toContain('كابوتشين'); // Caputchin brand
    el.remove();
  });

  it('lang="ar-EG" normalizes to ar via primary subtag', () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click', lang: 'ar-EG' });
    document.body.appendChild(el);
    expect(el.getAttribute('dir')).toBe('rtl');
    expect(el.shadowRoot!.textContent ?? '').toContain('تحقق');
    el.remove();
  });

  it('inline JSON fires invalid-config + falls back to auto (no dir flip)', () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click', lang: '{"_iso":"ar"}' });
    const messages: string[] = [];
    el.addEventListener('error', (e) => {
      const detail = (e as CustomEvent).detail as { message?: string };
      if (detail?.message) messages.push(detail.message);
    });
    document.body.appendChild(el);
    expect(messages.some((m) => /inline JSON/i.test(m))).toBe(true);
    expect(el.getAttribute('dir')).not.toBe('rtl');
    el.remove();
  });

  it('unknown preset name fires invalid-config + falls back to auto', () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click', lang: 'xyz' });
    const messages: string[] = [];
    el.addEventListener('error', (e) => {
      const detail = (e as CustomEvent).detail as { message?: string };
      if (detail?.message) messages.push(detail.message);
    });
    document.body.appendChild(el);
    expect(messages.some((m) => /xyz/.test(m))).toBe(true);
    el.remove();
  });
});
