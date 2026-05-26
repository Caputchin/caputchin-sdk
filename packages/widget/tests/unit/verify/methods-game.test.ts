import { describe, it, expect, vi, beforeEach } from 'vitest';

import { installGameMethods } from '../../../src/verify/methods-game.js';
import type { WidgetState } from '../../../src/verify/state.js';
import type { GameConfig } from '../../../src/config/game.js';

// Drive every branch of the customer-facing pass()/fail()/setNickname()
// handles directly against a controlled state, instead of the full element
// mount (which can't easily reach the multi-round / cap-release branches).

const API = 'https://api.test';

function gameEl(): HTMLElement & { pass: (p?: unknown) => void; fail: (p?: unknown) => void; setNickname: (s: string) => void } {
  return document.createElement('div') as never;
}

function capClientStub() {
  return { releaseGate: vi.fn(), abortGate: vi.fn(), solve: vi.fn(), reset: vi.fn(), dispose: vi.fn() };
}

function state(config: Partial<GameConfig> | null, parts: Partial<WidgetState<GameConfig>> = {}): WidgetState<GameConfig> {
  return {
    config: config === null ? null : ({ trigger: 'manual', sitekey: 'k', ...config } as GameConfig),
    ...parts,
  } as WidgetState<GameConfig>;
}

function errors(el: HTMLElement): Array<{ code: string; message: string }> {
  const out: Array<{ code: string; message: string }> = [];
  el.addEventListener('error', (e) => out.push((e as CustomEvent).detail));
  return out;
}
function passes(el: HTMLElement): CustomEvent[] {
  const out: CustomEvent[] = [];
  el.addEventListener('pass', (e) => out.push(e as CustomEvent));
  return out;
}

beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 200 }))); });

describe('installGameMethods — pass()', () => {
  it('no-ops silently when there is no config', () => {
    const el = gameEl();
    installGameMethods(el, state(null), API);
    expect(() => el.pass()).not.toThrow();
  });

  it('fires invalid-call when trigger is not manual', () => {
    const el = gameEl();
    const errs = errors(el);
    installGameMethods(el, state({ trigger: 'auto' }), API);
    el.pass({ score: 1 });
    expect(errs.some((e) => e.code === 'invalid-call' && e.message.includes('pass'))).toBe(true);
  });

  it('game-only manual (sitekey null) emits a fresh pass + verified each call', () => {
    const el = gameEl();
    const pass = passes(el);
    const presentation = { setState: vi.fn() };
    installGameMethods(el, state({ sitekey: null }, { gamePresentation: presentation as never }), API);
    el.pass({ trace: 'tr-a' });
    el.pass(); // no payload → empty trace; still a pass/fail-only event
    expect(pass).toHaveLength(2);
    // Pass/fail only — no score/durationMs surfaced (ADR-0069).
    expect(pass[0].detail).toEqual({ token: null, score: null, durationMs: null });
    expect(pass[1].detail).toEqual({ token: null, score: null, durationMs: null });
    expect(presentation.setState).toHaveBeenCalledWith('verified');
  });

  it('cap manual: errors if pass() runs before verification armed the gate', () => {
    const el = gameEl();
    const errs = errors(el);
    installGameMethods(el, state({ sitekey: 'k' }, { capClient: null }), API);
    el.pass();
    expect(errs.some((e) => e.code === 'invalid-call' && e.message.includes('before verification'))).toBe(true);
  });

  it('cap manual: first pass releases the gate, subsequent passes record rounds', () => {
    const el = gameEl();
    const cap = capClientStub();
    const st = state({ sitekey: 'k' }, { capClient: cap as never, widgetId: 'w1', lockedToken: 'tok' });
    installGameMethods(el, st, API);
    el.pass({ trace: 'tr-1' });
    expect(cap.releaseGate).toHaveBeenCalledWith({ trace: 'tr-1' });
    expect(st.firstPassFired).toBe(true);
    // second pass takes the recordAdditionalRound branch (no second release)
    el.pass({ trace: 'tr-2' });
    expect(cap.releaseGate).toHaveBeenCalledTimes(1);
  });

  it('no-verify manual (sitekey + no-verify, no cap gate) emits pass token:null — NOT invalid-call', () => {
    const el = gameEl();
    const errs = errors(el);
    const ps = passes(el);
    installGameMethods(el, state({ sitekey: 'k', noVerify: true }, { capClient: null }), API);
    el.pass({ trace: 'tr' });
    expect(errs.some((e) => e.code === 'invalid-call')).toBe(false);
    expect(ps.length).toBe(1);
    expect(ps[0]!.detail).toMatchObject({ token: null, score: null });
  });
});

describe('installGameMethods — fail()', () => {
  it('fires invalid-call when trigger is not manual', () => {
    const el = gameEl();
    const errs = errors(el);
    installGameMethods(el, state({ trigger: 'auto' }), API);
    el.fail();
    expect(errs.some((e) => e.code === 'invalid-call' && e.message.includes('fail'))).toBe(true);
  });

  it('cap manual: errors if fail() runs before the gate is armed', () => {
    const el = gameEl();
    const errs = errors(el);
    installGameMethods(el, state({ sitekey: 'k' }, { capClient: null }), API);
    el.fail();
    expect(errs.some((e) => e.code === 'invalid-call' && e.message.includes('before verification'))).toBe(true);
  });

  it('relays the failure, aborts the gate, and sets error state (custom code/message)', () => {
    const el = gameEl();
    const errs = errors(el);
    const cap = capClientStub();
    const presentation = { setState: vi.fn() };
    const st = state({ sitekey: 'k' }, { capClient: cap as never, gamePresentation: presentation as never });
    installGameMethods(el, st, API);
    el.fail({ code: 'boom', message: 'kaboom' });
    expect(st.gameErrored).toBe(true);
    // customer code rides as originalCode; the public code is the relay kind
    expect(errs.some((e) => e.code === 'game-error-relayed' && (e as { originalCode?: string }).originalCode === 'boom' && e.message === 'kaboom')).toBe(true);
    expect(cap.abortGate).toHaveBeenCalled();
    expect(presentation.setState).toHaveBeenCalledWith('error');
  });

  it('game-only manual (sitekey null) fails without a cap gate, using defaults', () => {
    const el = gameEl();
    const errs = errors(el);
    installGameMethods(el, state({ sitekey: null }), API);
    el.fail();
    // defaults: originalCode 'game-failed', default relay message
    expect(errs.some((e) => e.code === 'game-error-relayed' && (e as { originalCode?: string }).originalCode === 'game-failed')).toBe(true);
  });

  it('no-verify manual (sitekey + no-verify, no cap gate) relays fail() straight through — NOT invalid-call', () => {
    // The bug: with sitekey present the old guard demanded an armed gate, but
    // no-verify never arms one. fail() must relay like game-only does.
    const el = gameEl();
    const errs = errors(el);
    installGameMethods(el, state({ sitekey: 'k', noVerify: true }, { capClient: null }), API);
    el.fail({ code: 'boom' });
    expect(errs.some((e) => e.code === 'invalid-call')).toBe(false);
    expect(errs.some((e) => e.code === 'game-error-relayed' && (e as { originalCode?: string }).originalCode === 'boom')).toBe(true);
  });
});

describe('installGameMethods — setNickname()', () => {
  it('throws not-implemented (Post-MVP)', () => {
    const el = gameEl();
    installGameMethods(el, state({}), API);
    expect(() => el.setNickname('ABC')).toThrow(/not implemented/);
  });
});
