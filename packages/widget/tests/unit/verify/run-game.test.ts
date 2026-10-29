import { describe, it, expect, vi, afterEach } from 'vitest';

import { adoptLateSizing, resolveGameUrl, runGame } from '../../../src/verify/run-game.js';
import { createGamePresentation } from '../../../src/modes/game.js';
import { buildWidgetShell } from '../../../src/locale/widget-shell.js';
import { buildWidgetShellSkin } from '../../../src/skin/widget-shell-skin.js';
import { buildWidgetShellConfig } from '../../../src/configurations/widget-shell-config.js';
import type { GameConfig } from '../../../src/config/game.js';
import type { WidgetState } from '../../../src/verify/state.js';
import type { IframeToWidget } from '../../../src/protocol/messages.js';

// Mock IframeHost so the no-verify run path is exercised without building a real
// srcdoc iframe (the iframe-runtime define is absent under vitest). The captured
// onMessage lets a test drive game-pass / game-error after mount.
const hoisted = vi.hoisted(() => ({
  onMessage: null as ((m: IframeToWidget) => void) | null,
  host: null as { mount: ReturnType<typeof vi.fn>; setSize: ReturnType<typeof vi.fn> } | null,
}));
vi.mock('../../../src/iframe/host.js', () => ({
  IframeHost: vi.fn(function (this: unknown, _u: unknown, _i: unknown, _id: unknown, _el: unknown, onMessage: (m: IframeToWidget) => void) {
    hoisted.onMessage = onMessage;
    const host = {
      mount: vi.fn(),
      getIframe: () => ({}) as HTMLIFrameElement,
      setSize: vi.fn(),
      setLayoutContext: vi.fn(),
      kickoff: vi.fn(),
      dispose: vi.fn(),
    };
    hoisted.host = host;
    return host;
  }),
}));

// Stubbed cap session for the reuse-cleared describe block below: real
// setupCapSession pulls in the whole cap.js + custom-fetch machinery, which
// is exercised elsewhere (cap-session.test.ts, custom-fetch.test.ts). Here
// the only thing under test is run-game.ts's OWN wiring - does it skip the
// iframe entirely when the session reports cleared - so the cap session
// itself is faked with a controllable isCleared().
const capHoisted = vi.hoisted(() => ({ cleared: false, awaitCapAndEmitPass: vi.fn(async () => {}) }));
vi.mock('../../../src/verify/cap-session.js', () => ({
  setupCapSession: vi.fn(() => ({
    client: { releaseGate: vi.fn(), abortGate: vi.fn() },
    getWrappedToken: () => null,
    awaitSeed: async () => null,
    isCleared: () => capHoisted.cleared,
  })),
  awaitCapAndEmitPass: capHoisted.awaitCapAndEmitPass,
}));

// resolveGameUrl is the seam where the game-load path either reuses the
// mount-time bootstrap's bundle (single round trip) or falls back to a
// dedicated /widget/bootstrap resolve. These tests pin: reuse only when
// the prefetched bundle's id matches the resolved id (a `games` pool pick
// differs from the mount-time `game`), and identical fail-closed behavior.

const el = (): HTMLElement => document.createElement('div');

function cfg(parts: Partial<GameConfig>): GameConfig {
  return { game: null, games: null, gameSrc: null, sitekey: 'k', ...parts } as unknown as GameConfig;
}

function mockFetch(gameBlock: unknown): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ game: gameBlock }) }) as unknown as Response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('resolveGameUrl - bootstrap-bundle reuse', () => {
  it('reuses the prefetched bundle when its id matches - NO second fetch', async () => {
    const fetchFn = mockFetch({ url: 'https://should-not-be-called', integrity: 'nope' });
    const onError = vi.fn();
    const r = await resolveGameUrl(el(), cfg({ game: 'o/r' }), 'https://api', onError, {
      gameId: 'o/r',
      url: 'https://cdn.test/x.js',
      integrity: 'sha384-x',
    });
    expect(r).toEqual({ url: 'https://cdn.test/x.js', integrity: 'sha384-x', gameId: 'o/r' });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('falls back to a fresh resolve when no bundle was prefetched', async () => {
    const fetchFn = mockFetch({ url: 'https://cdn.test/y.js', integrity: 'sha384-y' });
    const r = await resolveGameUrl(el(), cfg({ game: 'o/r' }), 'https://api', vi.fn(), null);
    expect(r).toEqual({
      url: 'https://cdn.test/y.js',
      integrity: 'sha384-y',
      gameId: 'o/r',
      sizing: { preferred: null, responsive: undefined },
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('falls back to a fresh resolve when a games-pool pick differs from the prefetched id', async () => {
    const fetchFn = mockFetch({ url: 'https://cdn.test/pool.js', integrity: 'sha384-p' });
    // games pool resolves to "a/b"; the mount-time bundle was for "o/r" → mismatch.
    const r = await resolveGameUrl(el(), cfg({ game: 'o/r', games: 'a/b' }), 'https://api', vi.fn(), {
      gameId: 'o/r',
      url: 'https://cdn.test/x.js',
      integrity: 'sha384-x',
    });
    expect(r.gameId).toBe('a/b');
    expect(r.url).toBe('https://cdn.test/pool.js');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('fails closed (no fetch) when the prefetched bundle for this id has no url', async () => {
    const fetchFn = mockFetch({ url: 'https://should-not-be-called', integrity: 'nope' });
    const onError = vi.fn();
    const r = await resolveGameUrl(el(), cfg({ game: 'o/r' }), 'https://api', onError, {
      gameId: 'o/r',
      url: null,
      integrity: null,
    });
    expect(r.url).toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('uses the explicit game-src verbatim - no bundle, no fetch', async () => {
    const fetchFn = mockFetch({ url: 'x', integrity: 'y' });
    const r = await resolveGameUrl(el(), cfg({ gameSrc: 'https://host.test/g.js' }), 'https://api', vi.fn(), null);
    expect(r.url).toBe('https://host.test/g.js');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('runGame - escaped-throw backstop (errors never swallowed)', () => {
  // A throw inside the runner (here: gamePresentation.setState) escapes the
  // runners' own fireError paths. Every trigger consumes runVerification as
  // `.catch(() => {})`, so without the backstop it would vanish.
  function stateThatThrows(over: Partial<WidgetState<GameConfig>> = {}): WidgetState<GameConfig> {
    return {
      config: cfg({ game: 'o/r', sitekey: 'k' }), // shouldVerify → true
      gamePresentation: { setState: () => { throw new Error('boom'); } },
      gameBundle: null,
      gameErrored: false,
      ...over,
    } as unknown as WidgetState<GameConfig>;
  }

  it('surfaces an escaped throw as a verification-failed error event', async () => {
    const host = el();
    const details: { code?: string; message?: string }[] = [];
    host.addEventListener('error', (e) => details.push((e as CustomEvent).detail));
    await runGame(host, stateThatThrows(), 'https://api');
    expect(details.some((d) => d.code === 'verification-failed' && (d.message || '').includes('boom'))).toBe(true);
  });

  it('does NOT double-fire when a specific error already set gameErrored', async () => {
    const host = el();
    const details: unknown[] = [];
    host.addEventListener('error', (e) => details.push((e as CustomEvent).detail));
    await runGame(host, stateThatThrows({ gameErrored: true } as Partial<WidgetState<GameConfig>>), 'https://api');
    expect(details).toHaveLength(0);
  });
});

describe('runGame - no-verify path shows the verifying state', () => {
  // The no-verify / no-sitekey path runs no cap, but the iframe still loads and
  // the game runs. The presentation must surface `verifying` for that window
  // (parity with the cap + manual paths), then flip on game-pass / game-error.
  const PREFETCHED = { gameId: 'o/r', url: 'https://cdn.test/x.js', integrity: 'sha384-x' };

  function noVerifyState(over: Partial<WidgetState<GameConfig>> = {}): WidgetState<GameConfig> {
    return {
      // sitekey null → shouldVerify false → runGameOnly.
      config: cfg({ game: 'o/r', sitekey: null as unknown as string }),
      gamePresentation: { setState: vi.fn(), getIframeSlot: () => document.createElement('div') },
      gameBundle: PREFETCHED,
      gameResolved: null,
      gamePreferred: null,
      gameStartedEmitted: false,
      gameErrored: false,
      ...over,
    } as unknown as WidgetState<GameConfig>;
  }

  afterEach(() => { hoisted.onMessage = null; });

  it('enters verifying once the iframe mounts (no cap)', async () => {
    const state = noVerifyState();
    await runGame(el(), state, 'https://api');
    expect((state.gamePresentation!.setState as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('verifying');
  });

  it('flips verifying → verified on game-pass + emits pass with token:null', async () => {
    const host = el();
    const state = noVerifyState();
    const passes: { token: unknown; score: unknown }[] = [];
    host.addEventListener('pass', (e) => passes.push((e as CustomEvent).detail));
    await runGame(host, state, 'https://api');
    hoisted.onMessage?.({ kind: 'game-pass', seq: 1, trace: '' } as unknown as IframeToWidget);
    expect((state.gamePresentation!.setState as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('verified');
    expect(passes).toEqual([{ token: null, score: null, durationMs: null }]);
  });

  it('flips verifying → error on game-error', async () => {
    const host = el();
    const state = noVerifyState();
    const errors: { code?: string }[] = [];
    host.addEventListener('error', (e) => errors.push((e as CustomEvent).detail));
    await runGame(host, state, 'https://api');
    hoisted.onMessage?.({ kind: 'game-error', seq: 1, code: 'crash', message: 'boom' } as unknown as IframeToWidget);
    expect((state.gamePresentation!.setState as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('error');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('stays idle (no verifying) when no game is configured - inert mount', async () => {
    const state = noVerifyState({
      config: cfg({ game: null, games: null, gameSrc: null, sitekey: null as unknown as string }),
      gameBundle: null,
    });
    await runGame(el(), state, 'https://api');
    expect((state.gamePresentation!.setState as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('flips to error (not verifying) when the bundle fails to resolve', async () => {
    const state = noVerifyState({
      // Prefetched bundle for this id has a null url → resolveGameUrl fails closed.
      gameBundle: { gameId: 'o/r', url: null, integrity: null } as WidgetState<GameConfig>['gameBundle'],
    });
    await runGame(el(), state, 'https://api');
    const setState = state.gamePresentation!.setState as ReturnType<typeof vi.fn>;
    expect(setState).toHaveBeenCalledWith('error');
    expect(setState).not.toHaveBeenCalledWith('verifying');
  });
});

describe('runGame - reuse short-circuit (cleared session)', () => {
  // A cleared session means the platform already minted a token off a
  // stored clearance - no game replayed. run-game.ts must find that out
  // BEFORE constructing the iframe (checked via the mocked cap-session's
  // isCleared, settled at the same point the seed gate would settle) so no
  // game bundle ever loads for a visitor who's already verified.
  const PREFETCHED = { gameId: 'o/r', url: 'https://cdn.test/x.js', integrity: 'sha384-x' };

  function verifyState(over: Partial<WidgetState<GameConfig>> = {}): WidgetState<GameConfig> {
    return {
      config: cfg({ game: 'o/r', sitekey: 'k' }), // shouldVerify → true
      gamePresentation: { setState: vi.fn(), getIframeSlot: () => document.createElement('div') },
      gameBundle: PREFETCHED,
      gameResolved: null,
      gamePreferred: null,
      gameStartedEmitted: false,
      gameErrored: false,
      ...over,
    } as unknown as WidgetState<GameConfig>;
  }

  afterEach(() => { capHoisted.cleared = false; capHoisted.awaitCapAndEmitPass.mockClear(); });

  it('cleared: never constructs the iframe, dispatches start, and awaits the cap-session completion', async () => {
    capHoisted.cleared = true;
    const { IframeHost } = await import('../../../src/iframe/host.js');
    vi.mocked(IframeHost).mockClear();

    const host = el();
    const starts: unknown[] = [];
    host.addEventListener('start', (e) => starts.push((e as CustomEvent).detail));
    const state = verifyState();

    await runGame(host, state, 'https://api');

    expect(IframeHost).not.toHaveBeenCalled();
    expect(starts).toHaveLength(1);
    expect(capHoisted.awaitCapAndEmitPass).toHaveBeenCalledTimes(1);
  });

  it('not cleared: constructs the iframe as usual', async () => {
    capHoisted.cleared = false;
    const { IframeHost } = await import('../../../src/iframe/host.js');
    vi.mocked(IframeHost).mockClear();

    const state = verifyState();
    await runGame(el(), state, 'https://api');

    expect(IframeHost).toHaveBeenCalledTimes(1);
  });
});

describe('runGame - a degraded mount adopts the bundle resolve sizing', () => {
  // A degraded bootstrap leaves the mount with no game block: no preferred
  // footprint, responsive by default. The bundle resolve that follows returns
  // the game block, so a fixed-aspect game gets its size and the fit box.
  function degradedState(layout: 'inline' | 'modal', fetchBlock: unknown): WidgetState<GameConfig> {
    mockFetch(fetchBlock);
    const shadowHost = document.createElement('div');
    document.body.appendChild(shadowHost);
    const gp = createGamePresentation({
      host: document.createElement('div'),
      root: shadowHost.attachShadow({ mode: 'open' }),
      trigger: layout === 'inline' ? 'auto' : 'click',
      width: 'auto',
      height: null,
      footprintWidth: 'auto',
      footprintHeight: null,
      layout,
      fixedAspect: false,
      shell: buildWidgetShell(null),
      skin: buildWidgetShellSkin(null),
      shellConfig: buildWidgetShellConfig(null),
    });
    gp.mount();
    return {
      config: cfg({ game: 'caputchin/games/phobos', sitekey: null as unknown as string }),
      gamePresentation: gp,
      gameBundle: null,
      gameResolved: null,
      gamePreferred: null,
      gameResponsive: true,
      resolvedLayout: layout,
      gameFootprint: { width: 'auto', height: null },
      gameStartedEmitted: false,
      gameErrored: false,
    } as unknown as WidgetState<GameConfig>;
  }

  for (const layout of ['inline', 'modal'] as const) {
    it(`${layout}: a fixed-aspect game mounts into the fit box at its preferred size`, async () => {
      const state = degradedState(layout, {
        url: 'https://cdn.test/phobos.js',
        integrity: 'sha384-p',
        preferred: { width: 640, height: 400 },
        responsive: false,
      });
      await runGame(el(), state, 'https://api');
      expect(state.gameResponsive).toBe(false);
      expect(state.gamePreferred).toEqual({ width: 640, height: 400 });
      const slot = hoisted.host!.mount.mock.calls[0]![0] as HTMLElement;
      expect(slot.getAttribute('part')).toBe('game-fit-box');
      expect(hoisted.host!.setSize).toHaveBeenCalledWith(640, 400);
      state.gamePresentation!.unmount();
    });
  }

  it('the verify runner adopts it too (sitekey mount)', async () => {
    capHoisted.cleared = false;
    const state = degradedState('inline', {
      url: 'https://cdn.test/phobos.js',
      integrity: 'sha384-p',
      preferred: { width: 640, height: 400 },
      responsive: false,
    });
    state.config = cfg({ game: 'caputchin/games/phobos', sitekey: 'k' });
    await runGame(el(), state, 'https://api');
    const slot = hoisted.host!.mount.mock.calls[0]![0] as HTMLElement;
    expect(slot.getAttribute('part')).toBe('game-fit-box');
    expect(hoisted.host!.setSize).toHaveBeenCalledWith(640, 400);
    state.gamePresentation!.unmount();
  });

  it('a responsive game keeps the plain slot and still gets its preferred size', async () => {
    const state = degradedState('inline', {
      url: 'https://cdn.test/g.js',
      integrity: 'sha384-g',
      preferred: { width: 600, height: 150 },
    });
    await runGame(el(), state, 'https://api');
    expect(state.gameResponsive).toBe(true);
    const slot = hoisted.host!.mount.mock.calls[0]![0] as HTMLElement;
    expect(slot.getAttribute('part')).toBe('game-iframe-slot');
    expect(hoisted.host!.setSize).toHaveBeenCalledWith(600, 150);
    state.gamePresentation!.unmount();
  });
});

describe('adoptLateSizing', () => {
  function bare(over: Partial<WidgetState<GameConfig>> = {}): WidgetState<GameConfig> {
    return {
      gamePresentation: { useFixedAspect: vi.fn() },
      gameBundle: null,
      gamePreferred: null,
      gameResponsive: true,
      ...over,
    } as unknown as WidgetState<GameConfig>;
  }

  it('adopts only the pixel axes (a full axis and the layout shaped the mount)', () => {
    const state = bare();
    adoptLateSizing(state, { preferred: { width: 'full', height: 400, layout: 'modal' }, responsive: undefined });
    expect(state.gamePreferred).toEqual({ height: 400 });
    expect(state.gameResponsive).toBe(true);
    expect(state.gamePresentation!.useFixedAspect).not.toHaveBeenCalled();
  });

  it('keeps the fill path for a fixed-aspect game with a full axis (as a normal mount does)', () => {
    const state = bare();
    adoptLateSizing(state, { preferred: { width: 'full', height: 400 }, responsive: false });
    expect(state.gameResponsive).toBe(true);
    expect(state.gamePresentation!.useFixedAspect).not.toHaveBeenCalled();
  });

  it('keeps the mount data when the bootstrap did carry a game block', () => {
    const state = bare({
      gameBundle: { gameId: 'o/r', url: 'https://cdn.test/x.js', integrity: 'sha384-x' },
      gamePreferred: { width: 300, height: 200 },
    });
    adoptLateSizing(state, { preferred: { width: 640, height: 400 }, responsive: false });
    expect(state.gamePreferred).toEqual({ width: 300, height: 200 });
    expect(state.gameResponsive).toBe(true);
    expect(state.gamePresentation!.useFixedAspect).not.toHaveBeenCalled();
  });

  it('does nothing without a fresh resolve (game-src or a reused bundle)', () => {
    const state = bare();
    adoptLateSizing(state, undefined);
    expect(state.gamePreferred).toBeNull();
    expect(state.gamePresentation!.useFixedAspect).not.toHaveBeenCalled();
  });
});
