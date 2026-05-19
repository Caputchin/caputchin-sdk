import { describe, it, expect } from 'vitest';
import { getTestElement } from '../../fixtures/test-element';

declare global {
  var __CAPUTCHIN_API_HOST__: string;
}
(globalThis as unknown as { __CAPUTCHIN_API_HOST__: string }).__CAPUTCHIN_API_HOST__ = 'https://api.test.com';

describe('mode="simple" presentation', () => {
  it('renders a checkbox with Caputchin branding on mount', () => {
    const el = getTestElement({ sitekey: 'k', mode: 'simple', trigger: 'click' });
    document.body.appendChild(el);
    const checkbox = el.querySelector('[role="checkbox"]');
    expect(checkbox).not.toBeNull();
    expect(el.textContent).toContain('Caputchin');
    expect(el.textContent).toContain("I'm not a robot");
    el.remove();
  });

  it('removes the checkbox on disconnect', () => {
    const el = getTestElement({ sitekey: 'k', mode: 'simple', trigger: 'click' });
    document.body.appendChild(el);
    expect(el.querySelector('[role="checkbox"]')).not.toBeNull();
    el.remove();
    expect(el.querySelector('[role="checkbox"]')).toBeNull();
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
