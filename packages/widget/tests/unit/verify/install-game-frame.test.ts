import { describe, it, expect } from 'vitest';

import {
  resolveLocaleForGame,
  resolveSkinForGame,
} from '../../../src/verify/install-game-frame.js';
import type { GameConfig } from '../../../src/config/game.js';
import type { ManifestMessage } from '../../../src/protocol/messages.js';
import type { OverridesPerAxis } from '../../../src/bootstrap/types.js';

// These helpers are the seam where dashboard-authored per-game override
// banks (from the bootstrap `game` block) meet the game's own manifest
// presets. The merge primitive (injectOverrideLayer) + each axis resolver
// are unit-tested elsewhere; this file proves the GLUE: overrides are
// injected as a second layer over the manifest, name-collisions extend
// their bundled twin, and skin/config (which need a manifest schema) ignore
// overrides when the game declares no block.

const el = (): HTMLElement => document.createElement('div');

function cfg(overrides: Partial<GameConfig>): GameConfig {
  return { locale: null, skin: null, ...overrides } as unknown as GameConfig;
}

function manifest(parts: Partial<ManifestMessage>): ManifestMessage {
  return parts as unknown as ManifestMessage;
}

function overrides(parts: Partial<OverridesPerAxis>): OverridesPerAxis {
  return { locale: null, skin: null, configuration: null, ...parts };
}

describe('resolveLocaleForGame - override merge', () => {
  const baseManifest = manifest({
    locales: { presets: { en: { _lang: 'en', _default: true, hello: 'Hi' } } },
  });

  it('override of a same-name preset wins on the collided key, inherits the rest', () => {
    const ov = overrides({ locale: { presets: { en: { hello: 'Hola' } } } });
    const resolved = resolveLocaleForGame(el(), cfg({ locale: 'en' }), baseManifest, ov);
    expect(resolved).not.toBeNull();
    expect(resolved!.hello).toBe('Hola'); // override leaf wins
    expect(resolved!._lang).toBe('en'); // metadata inherited from bundled twin
  });

  it('no overrides → resolves straight from the manifest', () => {
    const resolved = resolveLocaleForGame(el(), cfg({ locale: 'en' }), baseManifest, overrides({}));
    expect(resolved!.hello).toBe('Hi');
  });

  it('override-only preset resolves even when the manifest ships no languages', () => {
    const ov = overrides({ locale: { presets: { en: { _lang: 'en', _default: true, hello: 'Hola' } } } });
    const resolved = resolveLocaleForGame(el(), cfg({ locale: 'en' }), manifest({ locales: null }), ov);
    expect(resolved!.hello).toBe('Hola');
  });

  it('no manifest presets and no overrides → null', () => {
    const resolved = resolveLocaleForGame(el(), cfg({ locale: 'en' }), manifest({ locales: null }), overrides({}));
    expect(resolved).toBeNull();
  });

  it('a NEW-NAME override default wins its group over the bundled default (override-first at the seam)', () => {
    // Not a same-name collision: the override preset has a distinct name but
    // the same _lang group + _default:true. The bundled preset is named
    // "english" (not its ISO) so `locale="en"` resolves by ISO-GROUP default
    // scan rather than exact-name match - that scan is where override-first
    // iteration must make the override win. This is the case the original
    // (bundled-first) bug got wrong.
    const m = manifest({ locales: { presets: { english: { _lang: 'en', _default: true, hello: 'Hi' } } } });
    const ov = overrides({ locale: { presets: { house_en: { _lang: 'en', _default: true, hello: 'Yo' } } } });
    const resolved = resolveLocaleForGame(el(), cfg({ locale: 'en' }), m, ov);
    expect(resolved).not.toBeNull();
    expect(resolved!.hello).toBe('Yo'); // override default wins, not bundled 'Hi'
  });
});

describe('resolveSkinForGame - override merge', () => {
  const baseManifest = manifest({
    skins: {
      schema: { primary: 'color', surface_bg: 'color' },
      presets: { light: { _theme: 'light', _default: true, primary: '#2F6640', surface_bg: '#ffffff' } },
    },
  });

  it('override merges over the manifest skin preset', () => {
    // A customer override that should be the active light skin carries the
    // selection metadata (_theme/_default) the dashboard saves; override-first
    // ordering then makes it win the mode scan over the bundled twin, while
    // unset keys inherit from that twin via the implicit _extends.
    const ov = overrides({ skin: { presets: { light: { _theme: 'light', _default: true, primary: '#FF0000' } } } });
    const resolved = resolveSkinForGame(el(), cfg({ skin: 'light' }), baseManifest, null, ov);
    expect(resolved).not.toBeNull();
    expect(resolved!.primary).toBe('#FF0000'); // override leaf wins
    expect(resolved!.surface_bg).toBe('#ffffff'); // inherited from bundled twin
  });

  it('no manifest skin block → null even when overrides are present (schema is manifest-authoritative)', () => {
    const ov = overrides({ skin: { presets: { light: { primary: '#FF0000' } } } });
    const resolved = resolveSkinForGame(el(), cfg({ skin: 'light' }), manifest({ skins: undefined }), null, ov);
    expect(resolved).toBeNull();
  });
});
