import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { recordAdditionalRound } from '../../../src/verify/record-round.js';
import type { WidgetState } from '../../../src/verify/state.js';

// getSessionId reads a private module map populated only by the live redeem
// flow, so the multi-round path is unreachable from a unit test without
// stubbing the lookup. Mock it to drive each branch deterministically.
const getSessionId = vi.fn<(id: string) => string | null>();
vi.mock('../../../src/cap/custom-fetch.js', () => ({
  getSessionId: (id: string) => getSessionId(id),
}));

const API = 'https://api.test';

function state(parts: Partial<WidgetState>): WidgetState {
  return { widgetId: 'w1', lockedToken: 'tok', ...parts } as WidgetState;
}

function passListener(el: HTMLElement): () => CustomEvent | null {
  let last: CustomEvent | null = null;
  el.addEventListener('pass', (e) => { last = e as CustomEvent; });
  return () => last;
}

beforeEach(() => {
  getSessionId.mockReset();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 200 })));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('recordAdditionalRound', () => {
  it('no-ops (no fetch, no pass) when widgetId or lockedToken is missing', async () => {
    const el = document.createElement('div');
    const last = passListener(el);
    await recordAdditionalRound(el, state({ widgetId: undefined }), API, { score: 1, durationMs: 2 });
    await recordAdditionalRound(el, state({ lockedToken: undefined }), API, { score: 1, durationMs: 2 });
    expect(window.fetch).not.toHaveBeenCalled();
    expect(last()).toBeNull();
  });

  it('no-ops when the session id is not yet known (race before cap.solve)', async () => {
    getSessionId.mockReturnValue(null);
    const el = document.createElement('div');
    const last = passListener(el);
    await recordAdditionalRound(el, state({}), API, { score: 1, durationMs: 2 });
    expect(window.fetch).not.toHaveBeenCalled();
    expect(last()).toBeNull();
  });

  it('posts /verify/pass with the session payload then emits a pass with the locked token', async () => {
    getSessionId.mockReturnValue('sess-9');
    const el = document.createElement('div');
    const last = passListener(el);
    await recordAdditionalRound(el, state({}), API, { score: 99, durationMs: 4200 });

    expect(window.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (window.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`${API}/api/v1/verify/pass`);
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      platform: { sessionId: 'sess-9', score: 99, durationMs: 4200 },
    });
    expect(last()!.detail).toEqual({ token: 'tok', score: 99, durationMs: 4200 });
  });

  it('still emits the pass event when the best-effort fetch rejects', async () => {
    getSessionId.mockReturnValue('sess-9');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    const el = document.createElement('div');
    const last = passListener(el);
    await recordAdditionalRound(el, state({}), API, { score: 5, durationMs: 10 });
    expect(last()!.detail).toEqual({ token: 'tok', score: 5, durationMs: 10 });
  });
});
