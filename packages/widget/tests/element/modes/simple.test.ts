import { describe, it, expect } from 'vitest';
import { getTestElement } from '../../fixtures/test-element';

declare global {
  var __CAPUTCHIN_API_HOST__: string;
}
(globalThis as unknown as { __CAPUTCHIN_API_HOST__: string }).__CAPUTCHIN_API_HOST__ = 'https://api.test.com';

describe('mode="simple" presentation', () => {
  it('renders a checkbox with Caputchin branding on mount (inside shadow root)', () => {
    const el = getTestElement({ sitekey: 'k', mode: 'simple', trigger: 'click' });
    document.body.appendChild(el);
    const shadow = el.shadowRoot;
    expect(shadow).not.toBeNull();
    const checkbox = shadow!.querySelector('[role="checkbox"]');
    expect(checkbox).not.toBeNull();
    expect(shadow!.textContent).toContain('Caputchin');
    expect(shadow!.textContent).toContain("I'm not a robot");
    // Light-DOM children stay empty — internals are isolated.
    expect(el.querySelector('[role="checkbox"]')).toBeNull();
    el.remove();
  });

  it('removes the checkbox on disconnect', () => {
    const el = getTestElement({ sitekey: 'k', mode: 'simple', trigger: 'click' });
    document.body.appendChild(el);
    expect(el.shadowRoot!.querySelector('[role="checkbox"]')).not.toBeNull();
    el.remove();
    expect(el.shadowRoot!.querySelector('[role="checkbox"]')).toBeNull();
  });
});

describe('mode="invisible" presentation', () => {
  it('renders no DOM', () => {
    const el = getTestElement({ sitekey: 'k', mode: 'invisible' });
    document.body.appendChild(el);
    expect(el.children.length).toBe(0);
    expect(el.textContent?.trim()).toBe('');
    el.remove();
  });
});
