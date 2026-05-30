import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Bridge, GameContext, GameFactory } from '../src/index';
import { register, DEFAULT_REGISTRY_KEY } from '../src/index';

type CapGlobal = {
  games: Record<string, GameFactory>;
};

function capGlobal(): CapGlobal {
  return (globalThis as Record<string, unknown>)['Caputchin'] as CapGlobal;
}

function setCapGlobal(value: unknown): void {
  (globalThis as Record<string, unknown>)['Caputchin'] = value;
}

function makeBridge(): Bridge {
  return { pass: vi.fn(), error: vi.fn(), setSize: vi.fn(), layout: null };
}

function makeFactory(): GameFactory {
  return vi.fn((_container, _bridge, _ctx) => () => {});
}

function installDataGameIdScript(id: string): HTMLScriptElement {
  const tag = document.createElement('script');
  tag.setAttribute('data-game-id', id);
  document.body.appendChild(tag);
  return tag;
}

beforeEach(() => {
  setCapGlobal(undefined);
});

afterEach(() => {
  document.querySelectorAll('script[data-game-id]').forEach((el) => el.remove());
});

describe('register()', () => {
  it('keys by data-game-id from the script tag', () => {
    setCapGlobal({ games: {} });
    installDataGameIdScript('caputchin/games/leaf-memory');
    const factory = makeFactory();
    register(factory);
    expect(capGlobal().games['caputchin/games/leaf-memory']).toBe(factory);
  });

  it('falls back to DEFAULT_REGISTRY_KEY when no data-game-id', () => {
    setCapGlobal({ games: {} });
    const factory = makeFactory();
    register(factory);
    expect(capGlobal().games[DEFAULT_REGISTRY_KEY]).toBe(factory);
  });

  it('creates globalThis.Caputchin with a warn when missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    installDataGameIdScript('new-game');
    const factory = makeFactory();
    register(factory);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Caputchin global not found'));
    expect(capGlobal().games['new-game']).toBe(factory);
    warnSpy.mockRestore();
  });

  it('logs a warn on a duplicate registry key and last-write-wins', () => {
    setCapGlobal({ games: {} });
    installDataGameIdScript('dup-game');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = makeFactory();
    const second = makeFactory();
    register(first);
    register(second);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('duplicate registry key'));
    expect(capGlobal().games['dup-game']).toBe(second);
    warnSpy.mockRestore();
  });

  it('Bridge type shape compiles and is callable', () => {
    const bridge = makeBridge();
    bridge.pass({ score: 0.5 });
    bridge.pass({ score: 1.0, durationMs: 3000 });
    bridge.error({ code: 'TIMEOUT' });
    bridge.error({ code: 'CRASH', message: 'out of memory' });
    bridge.setSize(640, 480);
    expect(bridge.pass).toHaveBeenCalledTimes(2);
    expect(bridge.error).toHaveBeenCalledTimes(2);
    expect(bridge.setSize).toHaveBeenCalledWith(640, 480);
  });

  it('Bridge.layout is readable', () => {
    const bridge = makeBridge();
    expect(bridge.layout).toBeNull();
  });

  it('2-arg and 3-arg factories both register cleanly', () => {
    setCapGlobal({ games: {} });
    installDataGameIdScript('two-arg');
    const twoArg: GameFactory = (_container, _bridge) => () => {};
    register(twoArg);
    expect(capGlobal().games['two-arg']).toBe(twoArg);
  });

  it('factory return value cleanup contract preserved', () => {
    setCapGlobal({ games: {} });
    installDataGameIdScript('with-cleanup');
    const cleanup = vi.fn();
    const factoryWithCleanup: GameFactory = (_c, _b, _ctx) => cleanup;
    register(factoryWithCleanup);

    const container = document.createElement('div');
    const bridge = makeBridge();
    const ctx: GameContext = { locale: null, skin: null, config: null };
    expect(typeof capGlobal().games['with-cleanup']!(container, bridge, ctx)).toBe('function');
  });

  it('factory receives ctx as third arg', () => {
    setCapGlobal({ games: {} });
    installDataGameIdScript('ctx-game');
    const factory = makeFactory();
    register(factory);
    const ctx: GameContext = {
      locale: { _direction: 'rtl', _lang: 'ar', hello: 'مرحبا' },
      skin: { _theme: 'dark', main_color: '#0F1810' },
      config: { show_high_score: true, max_level: 4, policy_link: 'https://example.com/policy' },
    };
    const container = document.createElement('div');
    const bridge = makeBridge();
    capGlobal().games['ctx-game']!(container, bridge, ctx);
    expect(factory).toHaveBeenCalledWith(container, bridge, ctx);
  });
});
