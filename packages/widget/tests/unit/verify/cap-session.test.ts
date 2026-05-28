import { describe, it, expect, vi, afterEach } from 'vitest';

import { awaitCapAndEmitPass } from '../../../src/verify/cap-session.js';
import type { CapClient } from '../../../src/cap/client.js';
import type { WidgetState } from '../../../src/verify/state.js';
import type { WrappedToken } from '../../../src/token.js';

// awaitCapAndEmitPass is the shared completion path for every runner. The
// happy path + each failure branch (solve threw, game-errored guard, no
// wrapped token) are driven here against a stubbed client + token closure.

afterEach(() => { document.body.innerHTML = ''; });

function client(solve: () => Promise<void>): CapClient {
  return { solve, releaseGate: vi.fn(), abortGate: vi.fn(), reset: vi.fn(), dispose: vi.fn() };
}
function presentation() {
  return { setState: vi.fn() };
}
function listen(el: HTMLElement) {
  const pass: CustomEvent[] = [];
  const err: CustomEvent[] = [];
  el.addEventListener('pass', (e) => pass.push(e as CustomEvent));
  el.addEventListener('error', (e) => err.push(e as CustomEvent));
  return { pass, err };
}

const token = (): WrappedToken => ({ token: 'wrapped', score: 5, durationMs: 50 } as WrappedToken);

describe('awaitCapAndEmitPass', () => {
  it('happy path: injects form token, sets verified, locks token, emits pass', async () => {
    const form = document.createElement('form');
    const el = document.createElement('div');
    form.appendChild(el);
    document.body.appendChild(form);
    const state = { connected: true } as WidgetState;
    const pres = presentation();
    const { pass } = listen(el);

    await awaitCapAndEmitPass(el, state, client(async () => {}), () => token(), pres);

    expect(form.querySelector<HTMLInputElement>('input[name="caputchin-token"]')!.value).toBe('wrapped');
    expect(pres.setState).toHaveBeenCalledWith('verified');
    expect(state.lockedToken).toBe('wrapped');
    expect(pass[0].detail).toEqual({ token: 'wrapped', score: 5, durationMs: 50 });
  });

  it('solve rejects: fires verification-failed + error state', async () => {
    const el = document.createElement('div');
    const pres = presentation();
    const { err } = listen(el);
    await awaitCapAndEmitPass(el, { connected: true } as WidgetState, client(async () => { throw new Error('nope'); }), () => null, pres);
    expect(err.some((e) => e.detail.code === 'verification-failed')).toBe(true);
    expect(pres.setState).toHaveBeenCalledWith('error');
  });

  it('solve rejects but game already errored: stays error, no duplicate fire', async () => {
    const el = document.createElement('div');
    const pres = presentation();
    const { err } = listen(el);
    const state = { connected: true, gameErrored: true } as WidgetState;
    await awaitCapAndEmitPass(el, state, client(async () => { throw new Error('nope'); }), () => null, pres);
    expect(err).toHaveLength(0);
    expect(pres.setState).toHaveBeenCalledWith('error');
  });

  it('game errored during solve: bails to error before emitting pass', async () => {
    const el = document.createElement('div');
    const pres = presentation();
    const { pass } = listen(el);
    const state = { connected: true, gameErrored: true } as WidgetState;
    await awaitCapAndEmitPass(el, state, client(async () => {}), () => token(), pres);
    expect(pass).toHaveLength(0);
    expect(pres.setState).toHaveBeenCalledWith('error');
  });

  it('no wrapped token: fires cap-redeem-failed', async () => {
    const el = document.createElement('div');
    const pres = presentation();
    const { err } = listen(el);
    await awaitCapAndEmitPass(el, { connected: true } as WidgetState, client(async () => {}), () => null, pres);
    expect(err.some((e) => (e.detail as { originalCode?: string }).originalCode === 'cap-redeem-failed')).toBe(true);
  });

  it('disposed widget (state.connected=false): silent on solve rejection, no error emit', async () => {
    // The host widget unmounted mid-solve (React effect cleanup ran while
    // cap.solve was still awaiting redeem). The disposed-widget guard in the
    // redeem branch rejects the in-flight POST with widget-disposed; the
    // rejection should NOT leak as a verification-failed event on the
    // detached element (the harness's addEventListener stays attached even
    // after the element is removed from DOM, so any emit would still surface
    // in the parent UI's log).
    const el = document.createElement('div');
    const pres = presentation();
    const { err } = listen(el);
    const state = { connected: false } as WidgetState;
    await awaitCapAndEmitPass(el, state, client(async () => { throw new Error('widget-disposed'); }), () => null, pres);
    expect(err).toHaveLength(0);
    expect(pres.setState).not.toHaveBeenCalled();
  });

  it('disposed widget on solve success: still no pass emit', async () => {
    // Symmetric path: a solve that managed to resolve cleanly post-dispose
    // shouldn't fire the pass event on a detached element either.
    const el = document.createElement('div');
    const pres = presentation();
    const { pass } = listen(el);
    const state = { connected: false } as WidgetState;
    await awaitCapAndEmitPass(el, state, client(async () => {}), () => token(), pres);
    expect(pass).toHaveLength(0);
    expect(pres.setState).not.toHaveBeenCalled();
  });
});
