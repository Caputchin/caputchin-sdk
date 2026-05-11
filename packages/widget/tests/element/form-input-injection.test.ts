import { describe, it, expect } from 'vitest';
import { injectHiddenInput } from '../../src/form.js';
import { findEnclosingForm } from '../../src/form.js';

describe('injectHiddenInput', () => {
  it('creates hidden input with correct name and value', () => {
    const form = document.createElement('form');
    document.body.appendChild(form);
    injectHiddenInput(form, 'token-abc');
    const input = form.querySelector<HTMLInputElement>('input[name="caputchin-token"]');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('token-abc');
    form.remove();
  });

  it('updates existing input value', () => {
    const form = document.createElement('form');
    document.body.appendChild(form);
    injectHiddenInput(form, 'first');
    injectHiddenInput(form, 'second');
    const inputs = form.querySelectorAll('input[name="caputchin-token"]');
    expect(inputs.length).toBe(1);
    expect((inputs[0] as HTMLInputElement).value).toBe('second');
    form.remove();
  });
});

describe('findEnclosingForm', () => {
  it('finds parent form', () => {
    const form = document.createElement('form');
    const div = document.createElement('div');
    const el = document.createElement('div');
    form.appendChild(div);
    div.appendChild(el);
    document.body.appendChild(form);
    expect(findEnclosingForm(el)).toBe(form);
    form.remove();
  });

  it('returns null when no form ancestor', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(findEnclosingForm(el)).toBeNull();
    el.remove();
  });
});
