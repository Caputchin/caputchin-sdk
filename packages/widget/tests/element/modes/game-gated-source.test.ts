import { describe, it, expect, beforeAll, vi } from 'vitest';
import { getGame } from '../../fixtures/test-element';

declare global {
  var __CAPUTCHIN_API_HOST__: string;
}
(globalThis as unknown as { __CAPUTCHIN_API_HOST__: string }).__CAPUTCHIN_API_HOST__ = 'https://api.test.com';

// flushMount: wait one macrotask so the bootstrap .then chain settles before
// the test asserts. Same pattern as tests/element/modes/simple.test.ts.
function flushMount(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function stubBootstrap(body: unknown, status = 200): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

function listenError(el: HTMLElement, code: string): { details: { message?: string; originalCode?: string }[] } {
  const out: { details: { message?: string; originalCode?: string }[] } = { details: [] };
  el.addEventListener('error', (e) => {
    const detail = (e as CustomEvent).detail as { code?: string; message?: string; originalCode?: string };
    if (detail?.code === code) out.details.push({ message: detail.message, originalCode: detail.originalCode });
  });
  return out;
}

function listenInvalidConfig(el: HTMLElement): { messages: string[] } {
  const out: { messages: string[] } = { messages: [] };
  el.addEventListener('error', (e) => {
    const detail = (e as CustomEvent).detail as { code?: string; message?: string };
    if (detail?.code === 'invalid-config' && typeof detail.message === 'string') out.messages.push(detail.message);
  });
  return out;
}

// Phase 13: gated key + `game-src` is ALLOWED when the server's picked game is
// a custom-replayable one (no platform-vendored bundle); the customer's CDN
// keeps the playable, the platform stored the headless run.js for replay.
// game-src is REJECTED when the server picked a marketplace game (the page is
// trying to override the gate).
beforeAll(() => {
  // Real customElement definitions happen on first getGame().
});

describe('gated-key game-src enforcement (Phase 13)', () => {
  it('keeps game-src + emits no invalid-config when bootstrap picks a custom-replayable id (game.url is null + matches page)', async () => {
    stubBootstrap({
      widget: { resolved: { locale: null, skin: null, config: null } },
      game: { url: null, integrity: null, runUrl: 'https://games.test.com/x/run.js', runIntegrity: 'sha384-x', runModules: null, preferred: null, resolved: { locale: null, skin: null, config: null } },
      requiresGame: true,
      gameId: 'customer/my-game',
      ticket: 'enc.sig',
    });
    const el = getGame({
      sitekey: 'cpt_pub_x',
      game: 'customer/my-game',
      'game-src': 'https://customer-cdn.example/my-game.js',
    });
    const captured = listenInvalidConfig(el);
    document.body.appendChild(el);
    await flushMount();
    // No invalid-config fired for game-src: the platform picked OUR custom id
    // and has no vendored bundle (game.url=null) → game-src is the trust root.
    expect(captured.messages.find((m) => m.includes('game-src is ignored'))).toBeUndefined();
    el.remove();
  });

  it('clears game-src + fires invalid-config when bootstrap picks a marketplace game (game.url is set)', async () => {
    stubBootstrap({
      widget: { resolved: { locale: null, skin: null, config: null } },
      game: { url: 'https://games.test.com/marketplace-bundle.js', integrity: 'sha384-mp', runUrl: null, runIntegrity: null, runModules: null, preferred: null, resolved: { locale: null, skin: null, config: null } },
      requiresGame: true,
      gameId: 'acme/games/leaf',
      ticket: 'enc.sig',
    });
    const el = getGame({
      sitekey: 'cpt_pub_x',
      game: 'acme/games/leaf',
      'game-src': 'https://customer-cdn.example/fake.js',
    });
    const captured = listenInvalidConfig(el);
    document.body.appendChild(el);
    await flushMount();
    expect(captured.messages.find((m) => m.includes('game-src is ignored'))).toBeDefined();
    el.remove();
  });

  it('fires invalid-config for trigger="manual" on a gated key regardless of game-src custom-replayable signal', async () => {
    stubBootstrap({
      widget: { resolved: { locale: null, skin: null, config: null } },
      game: { url: null, integrity: null, runUrl: 'https://games.test.com/x/run.js', runIntegrity: 'sha384-x', runModules: null, preferred: null, resolved: { locale: null, skin: null, config: null } },
      requiresGame: true,
      gameId: 'customer/my-game',
      ticket: 'enc.sig',
    });
    const el = getGame({ sitekey: 'cpt_pub_x', game: 'customer/my-game', trigger: 'manual' });
    const captured = listenInvalidConfig(el);
    document.body.appendChild(el);
    await flushMount();
    expect(captured.messages.find((m) => m.includes('trigger="manual" is not supported'))).toBeDefined();
    el.remove();
  });
});

describe('gated-key bootstrap 409 (gate-unavailable)', () => {
  it('fires gate-unavailable with the server message + originalCode on an authoritative 409', async () => {
    stubBootstrap(
      { error: 'gate-game-not-installed', message: 'Game "x/y" is not in this site key\'s verification pool.', game: 'x/y' },
      409,
    );
    const el = getGame({ sitekey: 'cpt_pub_x', game: 'x/y' });
    const errs = listenError(el, 'gate-unavailable');
    document.body.appendChild(el);
    await flushMount();
    expect(errs.details).toHaveLength(1);
    expect(errs.details[0]?.message).toContain('x/y');
    expect(errs.details[0]?.originalCode).toBe('gate-game-not-installed');
    // No doomed round wired: a gated key with no valid game must NOT mount an iframe.
    expect(el.shadowRoot?.querySelector('iframe')).toBeNull();
    el.remove();
  });

  it('does NOT fire gate-unavailable on a transient 5xx (degrades to bundled mount)', async () => {
    stubBootstrap('boom', 500);
    const el = getGame({ sitekey: 'cpt_pub_x', game: 'x/y' });
    const errs = listenError(el, 'gate-unavailable');
    document.body.appendChild(el);
    await flushMount();
    expect(errs.details).toHaveLength(0);
    el.remove();
  });
});
