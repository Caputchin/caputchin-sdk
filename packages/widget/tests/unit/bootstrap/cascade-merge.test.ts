import { describe, it, expect } from 'vitest';
import { injectOverrideLayer, BUNDLED_NAMESPACE_PREFIX } from '../../../src/bootstrap/cascade-merge.js';

interface FakePreset {
  _extends?: string;
  _iso?: string;
  primary?: string;
  surface_bg?: string;
}

describe('injectOverrideLayer', () => {
  it('returns a shallow copy of bundled when override is null/empty', () => {
    const bundled = { light: { primary: '#fff' }, dark: { primary: '#000' } } as Record<string, FakePreset>;
    const out = injectOverrideLayer(bundled, null);
    expect(out).toEqual(bundled);
    expect(out).not.toBe(bundled);
  });

  it('returns empty object when both bundled and override are null', () => {
    expect(injectOverrideLayer<FakePreset>(null, null)).toEqual({});
  });

  it('appends non-colliding override presets to the merged map', () => {
    const bundled = { default: { primary: '#fff' } } as Record<string, FakePreset>;
    const override = { custom: { primary: '#red' } } as Record<string, FakePreset>;
    const out = injectOverrideLayer(bundled, override);
    expect(Object.keys(out).sort()).toEqual(['custom', 'default']);
    expect(out['custom']).toBe(override['custom']);
  });

  it('on name collision: preserves bundled under namespaced alias + override implicitly extends it', () => {
    const bundled = { default: { primary: '#bundled', surface_bg: '#bundled-bg' } } as Record<string, FakePreset>;
    const override = { default: { primary: '#override' } } as Record<string, FakePreset>;
    const out = injectOverrideLayer(bundled, override);

    const aliasedName = `${BUNDLED_NAMESPACE_PREFIX}default`;
    expect(out[aliasedName]).toBe(bundled['default']);
    expect(out['default']).toEqual({ primary: '#override', _extends: aliasedName });
  });

  it('override with explicit _extends takes precedence over the implicit alias', () => {
    const bundled = { default: { primary: '#bundled' } } as Record<string, FakePreset>;
    const override = { default: { primary: '#override', _extends: 'some-other-preset' } } as Record<string, FakePreset>;
    const out = injectOverrideLayer(bundled, override);
    // Override's explicit _extends is preserved as-is (no implicit rewrite).
    expect(out['default']?._extends).toBe('some-other-preset');
    // Bundled still preserved under alias so the override can reference it
    // explicitly if it wants to.
    expect(out[`${BUNDLED_NAMESPACE_PREFIX}default`]).toBe(bundled['default']);
  });

  it('non-colliding overrides do not create namespaced aliases', () => {
    const bundled = { light: { primary: '#fff' } } as Record<string, FakePreset>;
    const override = { custom: { primary: '#red' } } as Record<string, FakePreset>;
    const out = injectOverrideLayer(bundled, override);
    const aliasedKeys = Object.keys(out).filter((k) => k.startsWith(BUNDLED_NAMESPACE_PREFIX));
    expect(aliasedKeys).toEqual([]);
  });

  it('multiple overrides: each handled independently', () => {
    const bundled = {
      default: { primary: '#default-bundled' },
      dark: { primary: '#dark-bundled' },
    } as Record<string, FakePreset>;
    const override = {
      default: { primary: '#default-override' },
      brand: { primary: '#brand-new' },
    } as Record<string, FakePreset>;
    const out = injectOverrideLayer(bundled, override);

    // default collides → namespaced alias + implicit extends
    expect(out[`${BUNDLED_NAMESPACE_PREFIX}default`]).toBe(bundled['default']);
    expect(out['default']?._extends).toBe(`${BUNDLED_NAMESPACE_PREFIX}default`);
    // brand doesn't collide → injected as-is
    expect(out['brand']?._extends).toBeUndefined();
    // dark untouched
    expect(out['dark']).toBe(bundled['dark']);
  });

  it('does not mutate the bundled or override input maps', () => {
    const bundledOrig = { default: { primary: '#fff' } } as Record<string, FakePreset>;
    const overrideOrig = { default: { primary: '#red' } } as Record<string, FakePreset>;
    const bundledSnap = JSON.parse(JSON.stringify(bundledOrig));
    const overrideSnap = JSON.parse(JSON.stringify(overrideOrig));
    injectOverrideLayer(bundledOrig, overrideOrig);
    expect(bundledOrig).toEqual(bundledSnap);
    expect(overrideOrig).toEqual(overrideSnap);
  });

  // ADR-0059 default-selection is override-first: the merged map iterates
  // override entries before bundled, so a downstream first-`_default` scan
  // picks the customer's preset over a bundled one in the same group.
  it('iterates override presets before bundled (override-first selection order)', () => {
    const bundled = {
      en: { _iso: 'en', primary: '#bundled' },
      ar: { _iso: 'ar', primary: '#bundled-ar' },
    } as Record<string, FakePreset>;
    const override = {
      'en-formal': { _iso: 'en', primary: '#override' },
    } as Record<string, FakePreset>;
    const keys = Object.keys(injectOverrideLayer(bundled, override));
    // Override new-name first, then bundled-only, aliases (none here) last.
    expect(keys).toEqual(['en-formal', 'en', 'ar']);
  });

  it('on collision: override slot precedes bundled-only, aliased bundled is last', () => {
    const bundled = {
      en: { _iso: 'en', primary: '#bundled-en' },
      ar: { _iso: 'ar', primary: '#bundled-ar' },
    } as Record<string, FakePreset>;
    const override = {
      en: { _iso: 'en', primary: '#override-en' },
    } as Record<string, FakePreset>;
    const keys = Object.keys(injectOverrideLayer(bundled, override));
    expect(keys).toEqual(['en', 'ar', `${BUNDLED_NAMESPACE_PREFIX}en`]);
  });
});
