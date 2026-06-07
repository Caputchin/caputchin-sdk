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

function dispatchKickoff(
  gameId: string | null,
  seq = 1,
  locale: unknown = null,
  skin: unknown = null,
  config: unknown = null,
  seed: unknown = null,
): void {
  const event = new MessageEvent('message', {
    data: { kind: 'kickoff', seq, gameId, seed, locale, skin, config },
    source: window,
  });
  window.dispatchEvent(event);
}

function registerGame(id: string, factory: (root: HTMLElement, bridge: unknown, ctx?: unknown) => void): void {
  const cap = (window as unknown as { Caputchin: { games: Record<string, unknown> } }).Caputchin;
  cap.games[id] = factory;
}

describe('iframe runtime - Caputchin global initialised on import', () => {
  it('window.Caputchin.games is an object', () => {
    const cap = (window as unknown as { Caputchin: { games: Record<string, unknown> } }).Caputchin;
    expect(cap).toBeDefined();
    expect(typeof cap.games).toBe('object');
  });
});

describe('iframe runtime - bridge.error contract', () => {
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

describe('iframe runtime - bridge.pass contract', () => {
  it('pass({trace}) posts the trace plus the captured input trace', () => {
    let captured: unknown = null;
    registerGame('c-1', (_root, bridge) => {
      captured = bridge;
    });
    dispatchKickoff('c-1', 3);

    (captured as { pass: (p: { trace: string }) => void }).pass({ trace: 'tr-3' });

    const done = posted.find((m) => m['kind'] === 'game-pass') as Record<string, unknown>;
    expect(done['kind']).toBe('game-pass');
    expect(done['seq']).toBe(3);
    expect(done['trace']).toBe('tr-3');
    // The input-motion trace rides alongside (a v1 JSON string).
    expect(typeof done['inputTrace']).toBe('string');
    expect(JSON.parse(done['inputTrace'] as string)).toMatchObject({ v: 1 });
  });

  it('pass({trace}) posts the opaque trace, no score/durationMs', () => {
    let captured: unknown = null;
    registerGame('c-2', (_root, bridge) => {
      captured = bridge;
    });
    dispatchKickoff('c-2', 4);

    (captured as { pass: (p: { trace: string }) => void }).pass({ trace: 'tr-4' });

    const done = posted.find((m) => m['kind'] === 'game-pass') as Record<string, unknown>;
    expect(done['trace']).toBe('tr-4');
    expect(Object.prototype.hasOwnProperty.call(done, 'score')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(done, 'durationMs')).toBe(false);
  });

  it('captures pointer + key events into the input trace', () => {
    let captured: unknown = null;
    registerGame('c-3', (_root, bridge) => {
      captured = bridge;
    });
    dispatchKickoff('c-3', 8);

    document.dispatchEvent(new MouseEvent('pointerdown', { clientX: 120, clientY: 90, bubbles: true }));
    document.dispatchEvent(new MouseEvent('pointerup', { clientX: 121, clientY: 91, bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft', bubbles: true }));

    (captured as { pass: (p: { trace: string }) => void }).pass({ trace: 'tr-8' });

    const done = posted.find((m) => m['kind'] === 'game-pass' && m['seq'] === 8) as Record<string, unknown>;
    const parsed = JSON.parse(done['inputTrace'] as string) as { v: number; e: number[][] };
    expect(parsed.v).toBe(1);
    // At least the down/up + key down/up landed (kinds 0,1,3,4).
    const kinds = parsed.e.map((ev) => ev[1]);
    expect(kinds).toContain(0);
    expect(kinds).toContain(1);
    expect(kinds).toContain(3);
    expect(kinds).toContain(4);
  });
});

// The runtime no longer posts a manifest on boot (the server resolves presets).
// Kickoff ctx delivery is unchanged.

describe('iframe runtime - kickoff ctx delivery', () => {
  it('kickoff with lang payload forwards ctx.locale to the factory', () => {
    let capturedCtx: unknown = null;
    registerGame('ctx-1', (_root, _bridge, ctx) => {
      capturedCtx = ctx;
    });
    const lang = { _direction: 'rtl', _lang: 'ar', hello: 'مرحبا' };
    dispatchKickoff('ctx-1', 200, lang);
    expect(capturedCtx).toEqual({ seed: null, locale: lang, skin: null, config: null });
  });

  it('kickoff with a seed forwards ctx.seed to the factory', () => {
    let capturedCtx: unknown = null;
    registerGame('ctx-seed', (_root, _bridge, ctx) => {
      capturedCtx = ctx;
    });
    dispatchKickoff('ctx-seed', 210, null, null, null, [1, 2, 3, 4]);
    expect(capturedCtx).toEqual({ seed: [1, 2, 3, 4], locale: null, skin: null, config: null });
  });

  it('kickoff with no lang forwards ctx.locale=null', () => {
    let capturedCtx: unknown = null;
    registerGame('ctx-2', (_root, _bridge, ctx) => {
      capturedCtx = ctx;
    });
    dispatchKickoff('ctx-2', 201);
    expect(capturedCtx).toEqual({ seed: null, locale: null, skin: null, config: null });
  });

  it('kickoff with skin payload forwards ctx.skin to the factory', () => {
    let capturedCtx: unknown = null;
    registerGame('ctx-3', (_root, _bridge, ctx) => {
      capturedCtx = ctx;
    });
    const skin = { _theme: 'dark', primary: '#4E9B65', leaf_img: 'https://example.com/leaf.png' };
    dispatchKickoff('ctx-3', 202, null, skin);
    expect(capturedCtx).toEqual({ seed: null, locale: null, skin, config: null });
  });

  it('kickoff with config payload forwards ctx.config to the factory', () => {
    let capturedCtx: unknown = null;
    registerGame('ctx-4', (_root, _bridge, ctx) => {
      capturedCtx = ctx;
    });
    const config = { show_high_score: true, difficulty: 'hard', peek_seconds: 1.5 };
    dispatchKickoff('ctx-4', 203, null, null, config);
    expect(capturedCtx).toEqual({ seed: null, locale: null, skin: null, config });
  });
});

describe('iframe runtime - layout-context msg', () => {
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

describe('iframe runtime - kickoff missing factory', () => {
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

  it('kickoff arriving BEFORE the game registers (parser still running) defers to DOMContentLoaded', async () => {
    // The realistic race: the iframe's runtime <script> runs first + attaches
    // the message listener. The parent posts kickoff. The second
    // parser-blocking <script src> (the game) hasn't executed yet, so the
    // registry is empty. Without the defer the runtime would fire a spurious
    // `game-not-registered`. With it, the runtime waits for DOMContentLoaded,
    // by which time the game has had its chance to call register().
    // Restore in finally so an assertion miss can't leak readyState='loading'
    // to subsequent tests in this file (which would defer their kickoffs to a
    // DCL that never fires, cascading into hangs).
    const originalReadyState = Object.getOwnPropertyDescriptor(Document.prototype, 'readyState')
      ?? Object.getOwnPropertyDescriptor(document, 'readyState');
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
    try {
      let factoryInvoked = false;
      dispatchKickoff('deferred-1', 77);

      // One microtask hop: the handler's await suspended on DOMContentLoaded.
      // No error should have fired yet.
      await Promise.resolve();
      expect(posted.find((m) => m['kind'] === 'game-error' && m['seq'] === 77)).toBeUndefined();
      expect(posted.find((m) => m['kind'] === 'game-started' && m['seq'] === 77)).toBeUndefined();

      // Game registers AFTER kickoff (the race window).
      registerGame('deferred-1', () => {
        factoryInvoked = true;
      });

      // Parser finishes - DOMContentLoaded fires. Runtime's await resolves and
      // retries the lookup; factory is now present.
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 0));

      expect(factoryInvoked).toBe(true);
      expect(posted.find((m) => m['kind'] === 'game-started' && m['seq'] === 77)).toBeDefined();
      expect(posted.find((m) => m['kind'] === 'game-error' && m['seq'] === 77)).toBeUndefined();
    } finally {
      if (originalReadyState) Object.defineProperty(document, 'readyState', originalReadyState);
      else Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
    }
  });
});
