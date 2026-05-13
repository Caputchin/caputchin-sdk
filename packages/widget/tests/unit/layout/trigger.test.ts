import { describe, it, expect, vi } from 'vitest';
import { TriggerCheckbox } from '../../../src/layout/trigger.js';

describe('TriggerCheckbox', () => {
  it('initial state is idle with default label', () => {
    const trigger = new TriggerCheckbox(() => {});
    expect(trigger.getState()).toBe('idle');
    expect(trigger.element.dataset.state).toBe('idle');
    expect(trigger.element.textContent).toContain('Verify you are human');
  });

  it('aria-haspopup=dialog set', () => {
    const trigger = new TriggerCheckbox(() => {});
    expect(trigger.element.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.element.getAttribute('aria-expanded')).toBe('false');
  });

  it('setState updates dataset and label', () => {
    const trigger = new TriggerCheckbox(() => {});
    trigger.setState('verifying');
    expect(trigger.element.dataset.state).toBe('verifying');
    expect(trigger.element.textContent).toContain('Verifying');
  });

  it('spinner hidden in idle, visible in loading and verifying', () => {
    const trigger = new TriggerCheckbox(() => {});
    const spinner = trigger.element.querySelector('[part~="spinner"]') as HTMLSpanElement;
    expect(spinner.hidden).toBe(true);

    trigger.setState('loading');
    expect(spinner.hidden).toBe(false);

    trigger.setState('verifying');
    expect(spinner.hidden).toBe(false);

    trigger.setState('done');
    expect(spinner.hidden).toBe(true);
  });

  it('click fires onActivate when state is idle', () => {
    const onActivate = vi.fn();
    const trigger = new TriggerCheckbox(onActivate);
    trigger.element.click();
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it('click ignored when state is loading', () => {
    const onActivate = vi.fn();
    const trigger = new TriggerCheckbox(onActivate);
    trigger.setState('loading');
    trigger.element.click();
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('click ignored when state is verifying', () => {
    const onActivate = vi.fn();
    const trigger = new TriggerCheckbox(onActivate);
    trigger.setState('verifying');
    trigger.element.click();
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('click ignored when state is done', () => {
    const onActivate = vi.fn();
    const trigger = new TriggerCheckbox(onActivate);
    trigger.setState('done');
    trigger.element.click();
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('click fires onActivate again when state is error (retry path)', () => {
    const onActivate = vi.fn();
    const trigger = new TriggerCheckbox(onActivate);
    trigger.setState('error');
    trigger.element.click();
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it('exposes part attributes for shadow-parts styling', () => {
    const trigger = new TriggerCheckbox(() => {});
    expect(trigger.element.getAttribute('part')).toContain('trigger');
    expect(trigger.element.querySelector('[part~="checkbox"]')).not.toBeNull();
    expect(trigger.element.querySelector('[part~="label"]')).not.toBeNull();
    expect(trigger.element.querySelector('[part~="spinner"]')).not.toBeNull();
  });
});
