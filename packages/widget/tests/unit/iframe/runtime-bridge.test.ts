import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

type CapturedMessage = Record<string, unknown>;

const posted: CapturedMessage[] = [];

beforeAll(async () => {
  vi.spyOn(window, 'postMessage').mockImplementation((msg) => {
    posted.push(msg as CapturedMessage);
  });

  document.body.innerHTML = '<div id="cpt-root"></div>';

  await import('../../../src/iframe/runtime.iife.ts');
});

beforeEach(() => {
  posted.length = 0;
});

function dispatchKickoff(gameId: string | null, seq = 1): void {
  const event = new MessageEvent('message', {
    data: { kind: 'kickoff', seq, gameId },
    source: window,
  });
  window.dispatchEvent(event);
}

function registerGame(id: string, factory: (root: HTMLElement, bridge: unknown) => void): void {
  const cap = (window as unknown as { Caputchin: { games: Record<string, unknown> } }).Caputchin;
  cap.games[id] = factory;
}

describe('iframe runtime — Caputchin global initialised on import', () => {
  it('window.Caputchin.games is an object', () => {
    const cap = (window as unknown as { Caputchin: { games: Record<string, unknown> } }).Caputchin;
    expect(cap).toBeDefined();
    expect(typeof cap.games).toBe('object');
  });
});

describe('iframe runtime — bridge.error contract', () => {
  it('error({code, message}) posts game-error with both fields intact', () => {
    let captured: unknown = null;
    registerGame('err-1', (_root, bridge) => {
      captured = bridge;
    });
    dispatchKickoff('err-1', 42);
    expect(captured).not.toBeNull();

    (captured as { error: (e: { code: string; message?: string }) => void }).error({
      code: 'TIMEOUT',
      message: 'out of memory',
    });

    const err = posted.find((m) => m['kind'] === 'game-error');
    expect(err).toBeDefined();
    expect(err!['seq']).toBe(42);
    expect(err!['code']).toBe('TIMEOUT');
    expect(err!['message']).toBe('out of memory');
  });

  it('error({code}) with no message posts empty string', () => {
    let captured: unknown = null;
    registerGame('err-2', (_root, bridge) => {
      captured = bridge;
    });
    dispatchKickoff('err-2', 7);

    (captured as { error: (e: { code: string; message?: string }) => void }).error({ code: 'ABORT' });

    const err = posted.find((m) => m['kind'] === 'game-error');
    expect(err!['code']).toBe('ABORT');
    expect(err!['message']).toBe('');
  });
});

describe('iframe runtime — bridge.complete contract', () => {
  it('complete({score, durationMs}) posts both fields', () => {
    let captured: unknown = null;
    registerGame('c-1', (_root, bridge) => {
      captured = bridge;
    });
    dispatchKickoff('c-1', 3);

    (captured as { complete: (p: { score: number; durationMs?: number }) => void }).complete({
      score: 0.5,
      durationMs: 4200,
    });

    const done = posted.find((m) => m['kind'] === 'game-complete');
    expect(done).toEqual({ kind: 'game-complete', seq: 3, score: 0.5, durationMs: 4200 });
  });

  it('complete({score}) with omitted durationMs posts null (not undefined)', () => {
    let captured: unknown = null;
    registerGame('c-2', (_root, bridge) => {
      captured = bridge;
    });
    dispatchKickoff('c-2', 4);

    (captured as { complete: (p: { score: number; durationMs?: number }) => void }).complete({
      score: 1.0,
    });

    const done = posted.find((m) => m['kind'] === 'game-complete');
    expect(done).toEqual({ kind: 'game-complete', seq: 4, score: 1.0, durationMs: null });
    expect(Object.prototype.hasOwnProperty.call(done, 'durationMs')).toBe(true);
    expect(done!['durationMs']).toBeNull();
  });
});

describe('iframe runtime — kickoff missing factory', () => {
  it('unknown gameId posts game-not-registered', () => {
    dispatchKickoff('no-such-game', 9);
    const err = posted.find((m) => m['kind'] === 'game-error');
    expect(err!['code']).toBe('game-not-registered');
  });

  it('gameId=null posts game-started without invoking any factory', () => {
    dispatchKickoff(null, 5);
    const started = posted.find((m) => m['kind'] === 'game-started');
    expect(started).toEqual({ kind: 'game-started', seq: 5 });
    expect(posted.find((m) => m['kind'] === 'game-error')).toBeUndefined();
  });
});
