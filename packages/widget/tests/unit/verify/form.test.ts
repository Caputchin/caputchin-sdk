import { describe, it, expect, afterEach } from 'vitest';

import { injectTokenIntoEnclosingForm } from '../../../src/verify/form.js';

afterEach(() => { document.body.innerHTML = ''; });

describe('injectTokenIntoEnclosingForm', () => {
  it('injects a hidden caputchin-token input into the enclosing form', () => {
    const form = document.createElement('form');
    const el = document.createElement('div');
    form.appendChild(el);
    document.body.appendChild(form);

    injectTokenIntoEnclosingForm(el, 'tok-123');

    const input = form.querySelector<HTMLInputElement>('input[name="caputchin-token"]');
    expect(input).not.toBeNull();
    expect(input!.type).toBe('hidden');
    expect(input!.value).toBe('tok-123');
  });

  it('updates the existing input on a second call rather than duplicating', () => {
    const form = document.createElement('form');
    const el = document.createElement('div');
    form.appendChild(el);
    document.body.appendChild(form);

    injectTokenIntoEnclosingForm(el, 'first');
    injectTokenIntoEnclosingForm(el, 'second');

    const inputs = form.querySelectorAll('input[name="caputchin-token"]');
    expect(inputs).toHaveLength(1);
    expect((inputs[0] as HTMLInputElement).value).toBe('second');
  });

  it('is a no-op when the element is not inside a form', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(() => injectTokenIntoEnclosingForm(el, 'tok')).not.toThrow();
    expect(document.querySelector('input[name="caputchin-token"]')).toBeNull();
  });
});
