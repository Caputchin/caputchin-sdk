import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Bridge, GameContext, GameFactory, GameManifest } from '../src/index';
import { register, DEFAULT_REGISTRY_KEY } from '../src/index';

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
  return { ...overrides };
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
  it('keys by manifest.id when present (legacy manifest)', () => {
    setCapGlobal({ games: {}, manifests: {} });
    const factory = makeFactory();
    register(makeManifest({ id: 'my-game' }), factory);
    expect(capGlobal().games['my-game']).toBe(factory);
  });

  it('keys by data-game-id from script tag when manifest carries no id', () => {
    setCapGlobal({ games: {}, manifests: {} });
    installDataGameIdScript('caputchin/games/leaf-memory');
    const factory = makeFactory();
    register(makeManifest(), factory);
    expect(capGlobal().games['caputchin/games/leaf-memory']).toBe(factory);
  });

  it('falls back to DEFAULT_REGISTRY_KEY when no id and no data-game-id', () => {
    setCapGlobal({ games: {}, manifests: {} });
    const factory = makeFactory();
    register(makeManifest(), factory);
    expect(capGlobal().games[DEFAULT_REGISTRY_KEY]).toBe(factory);
  });

  it('manifest.id wins over data-game-id (legacy precedence)', () => {
    setCapGlobal({ games: {}, manifests: {} });
    installDataGameIdScript('caputchin/games/leaf-memory');
    const factory = makeFactory();
    register(makeManifest({ id: 'legacy-id' }), factory);
    expect(capGlobal().games['legacy-id']).toBe(factory);
    expect(capGlobal().games['caputchin/games/leaf-memory']).toBeUndefined();
  });

  it('writes manifest to globalThis.Caputchin.manifests keyed the same way as games', () => {
    setCapGlobal({ games: {}, manifests: {} });
    installDataGameIdScript('caputchin/games/leaf-memory');
    const manifest = makeManifest({
      preferred: { width: 600, height: 400 },
    });
    register(manifest, makeFactory());
    expect(capGlobal().manifests['caputchin/games/leaf-memory']).toBe(manifest);
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

  it('logs warn on duplicate registry key and last-write-wins for both maps', () => {
    setCapGlobal({ games: {}, manifests: {} });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = makeFactory();
    const second = makeFactory();
    const firstManifest = makeManifest({ id: 'dup-game' });
    const secondManifest = makeManifest({ id: 'dup-game' });
    register(firstManifest, first);
    register(secondManifest, second);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('duplicate registry key'));
    expect(capGlobal().games['dup-game']).toBe(second);
    expect(capGlobal().manifests['dup-game']).toBe(secondManifest);
    warnSpy.mockRestore();
  });

  it('warns and returns when manifest argument is not an object', () => {
    setCapGlobal({ games: {}, manifests: {} });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const factory = makeFactory();
    register(null as unknown as GameManifest, factory);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('without a manifest'));
    expect(Object.keys(capGlobal().games).length).toBe(0);
    expect(Object.keys(capGlobal().manifests).length).toBe(0);
    warnSpy.mockRestore();
  });

  it('round-trips locales.presets intact on the stored manifest', () => {
    setCapGlobal({ games: {}, manifests: {} });
    const manifest = makeManifest({
      id: 'locale-game',
      locales: {
        presets: {
          en: { _iso: 'en', _default: true, hello: 'Hi' },
          ar: { _iso: 'ar', _default: true, hello: 'مرحبا' },
        },
      },
    });
    register(manifest, makeFactory());
    expect(capGlobal().manifests['locale-game'].locales).toEqual(manifest.locales);
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
          light: { _theme: 'light', _default: true, main_color: '#fff', leaf_img: '/leaf-light.png' },
          dark: { _theme: 'dark', _default: true, _extends: 'light', main_color: '#000' },
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
    const ctx: GameContext = { locale: null, skin: null, config: null };

    expect(typeof capGlobal().games['with-cleanup']!(container, bridge, ctx)).toBe('function');
    expect(capGlobal().games['void-factory']!(container, bridge, ctx)).toBeUndefined();
  });

  it('factory receives ctx as third arg', () => {
    setCapGlobal({ games: {}, manifests: {} });
    const factory = makeFactory();
    register(makeManifest({ id: 'ctx-game' }), factory);
    const ctx: GameContext = {
      locale: { _direction: 'rtl', _iso: 'ar', hello: 'مرحبا' },
      skin: { _theme: 'dark', main_color: '#0F1810' },
      config: { show_high_score: true, max_level: 4, policy_link: 'https://example.com/policy' },
    };
    const container = document.createElement('div');
    const bridge = makeBridge();
    capGlobal().games['ctx-game']!(container, bridge, ctx);
    expect(factory).toHaveBeenCalledWith(container, bridge, ctx);
  });

  it('round-trips configurations.presets + configurations.schema intact on the stored manifest', () => {
    setCapGlobal({ games: {}, manifests: {} });
    const manifest = makeManifest({
      id: 'cfg-game',
      configurations: {
        schema: {
          show_high_score: 'boolean',
          difficulty: ['easy', 'medium', 'hard'],
          peek_seconds: { type: 'range', min: 0.5, max: 5, step: 0.5 },
          policy_link: { type: 'link', name: 'Privacy policy', description: 'External link' },
        },
        presets: {
          default: { _default: true, show_high_score: true, difficulty: 'medium' },
          hard: { _extends: 'default', difficulty: 'hard' },
        },
      },
    });
    register(manifest, makeFactory());
    expect(capGlobal().manifests['cfg-game'].configurations).toEqual(manifest.configurations);
  });
});
