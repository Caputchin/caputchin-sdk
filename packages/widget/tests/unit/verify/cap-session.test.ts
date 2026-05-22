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
    const state = {} as WidgetState;
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
    await awaitCapAndEmitPass(el, {} as WidgetState, client(async () => { throw new Error('nope'); }), () => null, pres);
    expect(err.some((e) => e.detail.code === 'verification-failed')).toBe(true);
    expect(pres.setState).toHaveBeenCalledWith('error');
  });

  it('solve rejects but game already errored: stays error, no duplicate fire', async () => {
    const el = document.createElement('div');
    const pres = presentation();
    const { err } = listen(el);
    const state = { gameErrored: true } as WidgetState;
    await awaitCapAndEmitPass(el, state, client(async () => { throw new Error('nope'); }), () => null, pres);
    expect(err).toHaveLength(0);
    expect(pres.setState).toHaveBeenCalledWith('error');
  });

  it('game errored during solve: bails to error before emitting pass', async () => {
    const el = document.createElement('div');
    const pres = presentation();
    const { pass } = listen(el);
    const state = { gameErrored: true } as WidgetState;
    await awaitCapAndEmitPass(el, state, client(async () => {}), () => token(), pres);
    expect(pass).toHaveLength(0);
    expect(pres.setState).toHaveBeenCalledWith('error');
  });

  it('no wrapped token: fires cap-redeem-failed', async () => {
    const el = document.createElement('div');
    const pres = presentation();
    const { err } = listen(el);
    await awaitCapAndEmitPass(el, {} as WidgetState, client(async () => {}), () => null, pres);
    expect(err.some((e) => (e.detail as { originalCode?: string }).originalCode === 'cap-redeem-failed')).toBe(true);
  });
});
