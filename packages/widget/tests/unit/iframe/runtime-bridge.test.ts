import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

type CapturedMessage = Record<string, unknown>;

const posted: CapturedMessage[] = [];
let manifestOnBoot: CapturedMessage | null = null;

beforeAll(async () => {
  vi.spyOn(window, 'postMessage').mockImplementation((msg) => {
    posted.push(msg as CapturedMessage);
  });

  document.body.innerHTML = '<div id="cpt-root"></div>';

  await import('../../../src/iframe/runtime.iife.ts');

  manifestOnBoot = posted.find((m) => m['kind'] === 'manifest') ?? null;
});

beforeEach(() => {
  posted.length = 0;
});

function dispatchKickoff(gameId: string | null, seq = 1, lang: unknown = null): void {
  const event = new MessageEvent('message', {
    data: { kind: 'kickoff', seq, gameId, lang },
    source: window,
  });
  window.dispatchEvent(event);
}

function registerGame(id: string, factory: (root: HTMLElement, bridge: unknown, ctx?: unknown) => void): void {
  const cap = (window as unknown as { Caputchin: { games: Record<string, unknown> } }).Caputchin;
  cap.games[id] = factory;
}

describe('iframe runtime — Caputchin global initialised on import', () => {
  it('window.Caputchin.games is an object', () => {
    const cap = (window as unknown as { Caputchin: { games: Record<string, unknown> } }).Caputchin;
    expect(cap).toBeDefined();
    expect(typeof cap.games).toBe('object');
  });

  it('window.Caputchin.manifests is an object', () => {
    const cap = (window as unknown as { Caputchin: { manifests: Record<string, unknown> } }).Caputchin;
    expect(typeof cap.manifests).toBe('object');
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

describe('iframe runtime — bridge.pass contract', () => {
  it('pass({score, durationMs}) posts both fields', () => {
    let captured: unknown = null;
    registerGame('c-1', (_root, bridge) => {
      captured = bridge;
    });
    dispatchKickoff('c-1', 3);

    (captured as { pass: (p: { score: number; durationMs?: number }) => void }).pass({
      score: 0.5,
      durationMs: 4200,
    });

    const done = posted.find((m) => m['kind'] === 'game-pass');
    expect(done).toEqual({ kind: 'game-pass', seq: 3, score: 0.5, durationMs: 4200 });
  });

  it('pass({score}) with omitted durationMs posts null (not undefined)', () => {
    let captured: unknown = null;
    registerGame('c-2', (_root, bridge) => {
      captured = bridge;
    });
    dispatchKickoff('c-2', 4);

    (captured as { pass: (p: { score: number; durationMs?: number }) => void }).pass({
      score: 1.0,
    });

    const done = posted.find((m) => m['kind'] === 'game-pass');
    expect(done).toEqual({ kind: 'game-pass', seq: 4, score: 1.0, durationMs: null });
    expect(Object.prototype.hasOwnProperty.call(done, 'durationMs')).toBe(true);
    expect(done!['durationMs']).toBeNull();
  });
});

describe('iframe runtime — manifest posted on boot', () => {
  it('manifest message posted at boot', () => {
    expect(manifestOnBoot).not.toBeNull();
    expect(manifestOnBoot!['kind']).toBe('manifest');
  });

  it('manifest has gameId=null when no data-game-id script tag in test env', () => {
    expect(manifestOnBoot!['gameId']).toBeNull();
  });

  it('manifest has preferredLayout=null when no manifest registered for gameId', () => {
    expect(manifestOnBoot!['preferredLayout']).toBeNull();
  });

  it('manifest carries null languages when no manifest registered', () => {
    expect(manifestOnBoot!['languages']).toBeNull();
  });
});

describe('iframe runtime — kickoff ctx delivery', () => {
  it('kickoff with lang payload forwards ctx.lang to the factory', () => {
    let capturedCtx: unknown = null;
    registerGame('ctx-1', (_root, _bridge, ctx) => {
      capturedCtx = ctx;
    });
    const lang = { _direction: 'rtl', _iso: 'ar', hello: 'مرحبا' };
    dispatchKickoff('ctx-1', 200, lang);
    expect(capturedCtx).toEqual({ lang });
  });

  it('kickoff with no lang forwards ctx.lang=null', () => {
    let capturedCtx: unknown = null;
    registerGame('ctx-2', (_root, _bridge, ctx) => {
      capturedCtx = ctx;
    });
    dispatchKickoff('ctx-2', 201);
    expect(capturedCtx).toEqual({ lang: null });
  });
});

describe('iframe runtime — layout-context msg', () => {
  it('bridge.layout reflects layout-context msg sent before kickoff', () => {
    let captured: { layout: unknown } | null = null;
    registerGame('lc-1', (_root, bridge) => {
      captured = bridge as { layout: unknown };
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { kind: 'layout-context', seq: 0, layout: 'fullscreen' },
        source: window,
      }),
    );
    dispatchKickoff('lc-1', 100);

    expect(captured).not.toBeNull();
    expect(captured!.layout).toBe('fullscreen');
  });

  it('bridge.layout reflects layout-context msg sent after kickoff', () => {
    let captured: { layout: unknown } | null = null;
    registerGame('lc-2', (_root, bridge) => {
      captured = bridge as { layout: unknown };
    });

    dispatchKickoff('lc-2', 101);
    expect(captured).not.toBeNull();
    expect(captured!.layout).toBe('fullscreen'); // still last value set

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { kind: 'layout-context', seq: 0, layout: 'modal' },
        source: window,
      }),
    );
    expect(captured!.layout).toBe('modal');
  });

  it('invalid layout-context value is rejected', () => {
    let captured: { layout: unknown } | null = null;
    registerGame('lc-3', (_root, bridge) => {
      captured = bridge as { layout: unknown };
    });

    dispatchKickoff('lc-3', 102);
    const before = captured!.layout;
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { kind: 'layout-context', seq: 0, layout: 'bogus' },
        source: window,
      }),
    );
    expect(captured!.layout).toBe(before);
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
