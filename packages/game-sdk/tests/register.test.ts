import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Bridge, GameFactory, RegisterOptions } from '../src/index';
import { register } from '../src/index';

type CapGlobal = {
  games: Record<string, GameFactory>;
  gameOpts: Record<string, RegisterOptions>;
};

function capGlobal(): CapGlobal {
  return (globalThis as Record<string, unknown>)['Caputchin'] as CapGlobal;
}

function setCapGlobal(value: unknown): void {
  (globalThis as Record<string, unknown>)['Caputchin'] = value;
}

function makeBridge(): Bridge {
  return { pass: vi.fn(), error: vi.fn(), layout: null };
}

function makeFactory(): GameFactory {
  return vi.fn((_container, _bridge) => () => {});
}

beforeEach(() => {
  setCapGlobal(undefined);
});

describe('register()', () => {
  it('writes factory to globalThis.Caputchin.games[id]', () => {
    setCapGlobal({ games: {}, gameOpts: {} });
    const factory = makeFactory();
    register('my-game', factory);
    expect(capGlobal().games['my-game']).toBe(factory);
  });

  it('creates globalThis.Caputchin with warn when missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const factory = makeFactory();
    register('new-game', factory);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Caputchin global not found'));
    expect(capGlobal().games['new-game']).toBe(factory);
    warnSpy.mockRestore();
  });

  it('logs warn on duplicate id and last-write-wins', () => {
    setCapGlobal({ games: {}, gameOpts: {} });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = makeFactory();
    const second = makeFactory();
    register('dup-game', first);
    register('dup-game', second);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('duplicate game id'));
    expect(capGlobal().games['dup-game']).toBe(second);
    warnSpy.mockRestore();
  });

  it('stores opts.preferredLayout under gameOpts[id]', () => {
    setCapGlobal({ games: {}, gameOpts: {} });
    register('mod-game', makeFactory(), { preferredLayout: 'modal' });
    expect(capGlobal().gameOpts['mod-game']).toEqual({ preferredLayout: 'modal' });
  });

  it('omitted opts → no entry in gameOpts', () => {
    setCapGlobal({ games: {}, gameOpts: {} });
    register('no-opts', makeFactory());
    expect(capGlobal().gameOpts['no-opts']).toBeUndefined();
  });

  it('Bridge type shape compiles and is callable', () => {
    const bridge = makeBridge();
    bridge.pass({ score: 0.5 });
    bridge.pass({ score: 1.0, durationMs: 3000 });
    bridge.error({ code: 'TIMEOUT' });
    bridge.error({ code: 'CRASH', message: 'out of memory' });
    expect(bridge.pass).toHaveBeenCalledTimes(2);
    expect(bridge.error).toHaveBeenCalledTimes(2);
  });

  it('Bridge.layout is readable', () => {
    const bridge = makeBridge();
    expect(bridge.layout).toBeNull();
  });

  it('factory return value cleanup contract preserved', () => {
    setCapGlobal({ games: {}, gameOpts: {} });
    const cleanup = vi.fn();
    const factoryWithCleanup: GameFactory = (_container, _bridge) => cleanup;
    const factoryVoid: GameFactory = (_container, _bridge) => {};

    register('with-cleanup', factoryWithCleanup);
    register('void-factory', factoryVoid);

    const container = document.createElement('div');
    const bridge = makeBridge();

    expect(typeof capGlobal().games['with-cleanup']!(container, bridge)).toBe('function');
    expect(capGlobal().games['void-factory']!(container, bridge)).toBeUndefined();
  });
});
