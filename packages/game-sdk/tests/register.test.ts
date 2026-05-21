import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Bridge, GameContext, GameFactory, GameManifest } from '../src/index';
import { register } from '../src/index';

type CapGlobal = {
  games: Record<string, GameFactory>;
  manifests: Record<string, GameManifest>;
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

function makeManifest(overrides: Partial<GameManifest> = {}): GameManifest {
  return {
    id: 'my-game',
    version: '0.1.0',
    ...overrides,
  };
}

beforeEach(() => {
  setCapGlobal(undefined);
});

describe('register()', () => {
  it('writes factory to globalThis.Caputchin.games[id] keyed by manifest.id', () => {
    setCapGlobal({ games: {}, manifests: {} });
    const factory = makeFactory();
    register(makeManifest({ id: 'my-game' }), factory);
    expect(capGlobal().games['my-game']).toBe(factory);
  });

  it('writes manifest to globalThis.Caputchin.manifests[id]', () => {
    setCapGlobal({ games: {}, manifests: {} });
    const manifest = makeManifest({
      id: 'mod-game',
      preferredLayout: 'modal',
      preferredWidth: 600,
      preferredHeight: 400,
    });
    register(manifest, makeFactory());
    expect(capGlobal().manifests['mod-game']).toBe(manifest);
  });

  it('creates globalThis.Caputchin with warn when missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const factory = makeFactory();
    register(makeManifest({ id: 'new-game' }), factory);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Caputchin global not found'));
    expect(capGlobal().games['new-game']).toBe(factory);
    expect(capGlobal().manifests['new-game']).toBeDefined();
    warnSpy.mockRestore();
  });

  it('logs warn on duplicate id and last-write-wins for both maps', () => {
    setCapGlobal({ games: {}, manifests: {} });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = makeFactory();
    const second = makeFactory();
    const firstManifest = makeManifest({ id: 'dup-game', version: '0.1.0' });
    const secondManifest = makeManifest({ id: 'dup-game', version: '0.2.0' });
    register(firstManifest, first);
    register(secondManifest, second);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('duplicate game id'));
    expect(capGlobal().games['dup-game']).toBe(second);
    expect(capGlobal().manifests['dup-game']).toBe(secondManifest);
    warnSpy.mockRestore();
  });

  it('warns and returns when manifest is missing id', () => {
    setCapGlobal({ games: {}, manifests: {} });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const factory = makeFactory();
    register({ version: '0.1.0' } as GameManifest, factory);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing `id`'));
    expect(Object.keys(capGlobal().games).length).toBe(0);
    expect(Object.keys(capGlobal().manifests).length).toBe(0);
    warnSpy.mockRestore();
  });

  it('round-trips languages.presets intact on the stored manifest', () => {
    setCapGlobal({ games: {}, manifests: {} });
    const manifest = makeManifest({
      id: 'lang-game',
      languages: {
        presets: {
          en: { _iso: 'en', _default: true, hello: 'Hi' },
          ar: { _iso: 'ar', _default: true, hello: 'مرحبا' },
        },
      },
    });
    register(manifest, makeFactory());
    expect(capGlobal().manifests['lang-game'].languages).toEqual(manifest.languages);
  });

  it('round-trips skins.presets + skins.schema intact on the stored manifest', () => {
    setCapGlobal({ games: {}, manifests: {} });
    const manifest = makeManifest({
      id: 'skin-game',
      skins: {
        schema: {
          main_color: 'color',
          leaf_img: { type: 'image', name: 'Leaf', description: 'leaf art' },
        },
        presets: {
          light: { _mode: 'light', _default: true, main_color: '#fff', leaf_img: '/leaf-light.png' },
          dark: { _mode: 'dark', _default: true, _extends: 'light', main_color: '#000' },
        },
      },
    });
    register(manifest, makeFactory());
    expect(capGlobal().manifests['skin-game'].skins).toEqual(manifest.skins);
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
    setCapGlobal({ games: {}, manifests: {} });
    const twoArg: GameFactory = (_container, _bridge) => () => {};
    const threeArg: GameFactory = (_container, _bridge, _ctx) => () => {};
    register(makeManifest({ id: 'two-arg' }), twoArg);
    register(makeManifest({ id: 'three-arg' }), threeArg);
    expect(capGlobal().games['two-arg']).toBe(twoArg);
    expect(capGlobal().games['three-arg']).toBe(threeArg);
  });

  it('factory return value cleanup contract preserved', () => {
    setCapGlobal({ games: {}, manifests: {} });
    const cleanup = vi.fn();
    const factoryWithCleanup: GameFactory = (_c, _b, _ctx) => cleanup;
    const factoryVoid: GameFactory = (_c, _b, _ctx) => {};

    register(makeManifest({ id: 'with-cleanup' }), factoryWithCleanup);
    register(makeManifest({ id: 'void-factory' }), factoryVoid);

    const container = document.createElement('div');
    const bridge = makeBridge();
    const ctx: GameContext = { lang: null, skin: null };

    expect(typeof capGlobal().games['with-cleanup']!(container, bridge, ctx)).toBe('function');
    expect(capGlobal().games['void-factory']!(container, bridge, ctx)).toBeUndefined();
  });

  it('factory receives ctx as third arg', () => {
    setCapGlobal({ games: {}, manifests: {} });
    const factory = makeFactory();
    register(makeManifest({ id: 'ctx-game' }), factory);
    const ctx: GameContext = {
      lang: { _direction: 'rtl', _iso: 'ar', hello: 'مرحبا' },
      skin: { _mode: 'dark', main_color: '#0F1810' },
    };
    const container = document.createElement('div');
    const bridge = makeBridge();
    capGlobal().games['ctx-game']!(container, bridge, ctx);
    expect(factory).toHaveBeenCalledWith(container, bridge, ctx);
  });
});
