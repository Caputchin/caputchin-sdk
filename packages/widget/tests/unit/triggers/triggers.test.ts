import { describe, it, expect, vi, afterEach } from 'vitest';

import { createTriggerStrategy, type TriggerContext } from '../../../src/triggers/index.js';
import type { Presentation } from '../../../src/modes/index.js';

afterEach(() => { document.body.innerHTML = ''; });

// A presentation stub exposing a controllable onActivate so the click trigger
// can be driven without mounting real DOM.
function fakePresentation(): { presentation: Presentation; fireActivate: () => void; cleanupCalls: () => number } {
  let handler: (() => void) | null = null;
  let cleanups = 0;
  const presentation = {
    mount() {},
    unmount() {},
    setState() {},
    onActivate(h: () => void) {
      handler = h;
      return () => { cleanups += 1; handler = null; };
    },
  } as Presentation;
  return {
    presentation,
    fireActivate: () => handler?.(),
    cleanupCalls: () => cleanups,
  };
}

function ctx(overrides: Partial<TriggerContext> = {}): { c: TriggerContext; runs: () => number } {
  let runs = 0;
  const pres = fakePresentation().presentation;
  const c: TriggerContext = {
    el: document.createElement('div'),
    presentation: pres,
    runVerification: () => { runs += 1; return Promise.resolve(); },
    capClient: null,
    ...overrides,
  };
  return { c, runs: () => runs };
}

describe('createTriggerStrategy dispatch', () => {
  it('returns a strategy for every trigger kind', () => {
    for (const t of ['auto', 'click', 'form-submit', 'manual'] as const) {
      const s = createTriggerStrategy(t);
      expect(typeof s.activate).toBe('function');
      expect(typeof s.deactivate).toBe('function');
    }
  });
});

describe('auto trigger', () => {
  it('runs verification on activate, idempotent across forceStart until deactivate', () => {
    const s = createTriggerStrategy('auto');
    const { c, runs } = ctx();
    s.activate(c);
    s.forceStart?.(c);
    expect(runs()).toBe(1);
    s.deactivate();
    s.activate(c);
    expect(runs()).toBe(2);
  });
});

describe('manual trigger', () => {
  it('does nothing on activate; forceStart runs once; deactivate re-arms', () => {
    const s = createTriggerStrategy('manual');
    const { c, runs } = ctx();
    s.activate(c);
    expect(runs()).toBe(0);
    s.forceStart?.(c);
    s.forceStart?.(c);
    expect(runs()).toBe(1);
    s.deactivate();
    s.forceStart?.(c);
    expect(runs()).toBe(2);
  });
});

describe('click trigger', () => {
  it('runs verification when the activation surface fires, only once', () => {
    const s = createTriggerStrategy('click');
    const fake = fakePresentation();
    let runs = 0;
    const c: TriggerContext = {
      el: document.createElement('div'),
      presentation: fake.presentation,
      runVerification: () => { runs += 1; return Promise.resolve(); },
      capClient: null,
    };
    s.activate(c);
    fake.fireActivate();
    fake.fireActivate();
    expect(runs).toBe(1);
    s.deactivate();
    expect(fake.cleanupCalls()).toBe(1);
  });

  it('forceStart bypasses the click surface', () => {
    const s = createTriggerStrategy('click');
    const { c, runs } = ctx();
    s.forceStart?.(c);
    expect(runs()).toBe(1);
  });
});

describe('form-submit trigger', () => {
  function withForm(): { form: HTMLFormElement; el: HTMLElement } {
    const form = document.createElement('form');
    const el = document.createElement('div');
    form.appendChild(el);
    document.body.appendChild(form);
    return { form, el };
  }

  it('intercepts submit, runs verification, then re-submits the form', async () => {
    const { form, el } = withForm();
    const requestSubmit = vi.fn();
    form.requestSubmit = requestSubmit;
    const s = createTriggerStrategy('form-submit');
    let runs = 0;
    const c: TriggerContext = {
      el,
      presentation: fakePresentation().presentation,
      runVerification: () => { runs += 1; return Promise.resolve(); },
      capClient: null,
    };
    s.activate(c);

    const evt = new Event('submit', { cancelable: true, bubbles: true });
    form.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);
    expect(runs).toBe(1);
    // requestSubmit fires in the verification .then microtask
    await Promise.resolve();
    await Promise.resolve();
    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });

  it('silently falls back (no throw, no run) when the element is outside a form', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const s = createTriggerStrategy('form-submit');
    let runs = 0;
    const c: TriggerContext = {
      el,
      presentation: fakePresentation().presentation,
      runVerification: () => { runs += 1; return Promise.resolve(); },
      capClient: null,
    };
    expect(() => s.activate(c)).not.toThrow();
    // forceStart still works as the escape hatch
    s.forceStart?.(c);
    expect(runs).toBe(1);
  });

  it('deactivate removes the submit listener so later submits are not intercepted', () => {
    const { form, el } = withForm();
    form.requestSubmit = vi.fn();
    const s = createTriggerStrategy('form-submit');
    let runs = 0;
    const c: TriggerContext = {
      el,
      presentation: fakePresentation().presentation,
      runVerification: () => { runs += 1; return Promise.resolve(); },
      capClient: null,
    };
    s.activate(c);
    s.deactivate();
    const evt = new Event('submit', { cancelable: true, bubbles: true });
    form.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(false);
    expect(runs).toBe(0);
  });

  it('forceStart starts verification once even with a form present', () => {
    const { el } = withForm();
    const s = createTriggerStrategy('form-submit');
    let runs = 0;
    const c: TriggerContext = {
      el,
      presentation: fakePresentation().presentation,
      runVerification: () => { runs += 1; return Promise.resolve(); },
      capClient: null,
    };
    s.activate(c);
    s.forceStart?.(c);
    s.forceStart?.(c);
    expect(runs).toBe(1);
  });

  it('verifies in place on click without submitting the form; a later submit passes through', async () => {
    const { form, el } = withForm();
    const requestSubmit = vi.fn();
    form.requestSubmit = requestSubmit;
    const fake = fakePresentation();
    const s = createTriggerStrategy('form-submit');
    let runs = 0;
    const c: TriggerContext = {
      el,
      presentation: fake.presentation,
      runVerification: () => { runs += 1; return Promise.resolve(); },
      capClient: null,
    };
    s.activate(c);

    // Click the checkbox → verify in place, only once.
    fake.fireActivate();
    fake.fireActivate();
    expect(runs).toBe(1);
    await Promise.resolve();
    await Promise.resolve();
    // A click never auto-submits the form.
    expect(requestSubmit).not.toHaveBeenCalled();

    // A later native submit passes through (token already injected on the
    // successful click) with no interception and no second verification.
    const evt = new Event('submit', { cancelable: true, bubbles: true });
    form.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(false);
    expect(runs).toBe(1);
    expect(requestSubmit).not.toHaveBeenCalled();
  });

  it('holds a submit that arrives while a click verification is in flight, then releases it once', async () => {
    const { form, el } = withForm();
    const requestSubmit = vi.fn();
    form.requestSubmit = requestSubmit;
    const fake = fakePresentation();
    const s = createTriggerStrategy('form-submit');
    let runs = 0;
    let resolveVerify: () => void = () => {};
    const c: TriggerContext = {
      el,
      presentation: fake.presentation,
      runVerification: () => { runs += 1; return new Promise<void>((res) => { resolveVerify = res; }); },
      capClient: null,
    };
    s.activate(c);

    fake.fireActivate(); // click → verification in flight (unsettled)
    expect(runs).toBe(1);

    const evt = new Event('submit', { cancelable: true, bubbles: true });
    form.dispatchEvent(evt);
    // Submit is HELD (default prevented), not leaked; no second verification.
    expect(evt.defaultPrevented).toBe(true);
    expect(runs).toBe(1);
    expect(requestSubmit).not.toHaveBeenCalled();

    // Verification resolves → the held submit is released exactly once.
    resolveVerify();
    await Promise.resolve();
    await Promise.resolve();
    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });

  it('defers a submit that arrives while a forceStart verification is in flight', async () => {
    const { form, el } = withForm();
    const requestSubmit = vi.fn();
    form.requestSubmit = requestSubmit;
    const s = createTriggerStrategy('form-submit');
    let runs = 0;
    let resolveVerify: () => void = () => {};
    const c: TriggerContext = {
      el,
      presentation: fakePresentation().presentation,
      runVerification: () => { runs += 1; return new Promise<void>((res) => { resolveVerify = res; }); },
      capClient: null,
    };
    s.activate(c);
    s.forceStart?.(c); // in flight
    expect(runs).toBe(1);

    const evt = new Event('submit', { cancelable: true, bubbles: true });
    form.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);
    expect(runs).toBe(1);

    resolveVerify();
    await Promise.resolve();
    await Promise.resolve();
    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });

  it('deactivate tears down the click (onActivate) subscription', () => {
    const { form, el } = withForm();
    form.requestSubmit = vi.fn();
    const fake = fakePresentation();
    const s = createTriggerStrategy('form-submit');
    const c: TriggerContext = {
      el,
      presentation: fake.presentation,
      runVerification: () => Promise.resolve(),
      capClient: null,
    };
    s.activate(c);
    s.deactivate();
    expect(fake.cleanupCalls()).toBe(1);
  });
});
