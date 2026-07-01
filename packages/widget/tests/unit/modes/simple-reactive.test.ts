import { describe, it, expect } from 'vitest';
import { createSimplePresentation } from '../../../src/modes/simple.js';
import { buildWidgetShell } from '../../../src/locale/widget-shell.js';
import { buildWidgetShellSkin } from '../../../src/skin/widget-shell-skin.js';
import { buildWidgetShellConfig } from '../../../src/configurations/widget-shell-config.js';
import type { PresentationFactoryInput } from '../../../src/modes/index.js';

// Unit coverage for the in-place `applySkin` / `applyLocale` methods that back
// runtime skin/locale reactivity: they must re-theme / re-localize the mounted
// DOM WITHOUT a rebuild, re-rendering the CURRENT visual state (a solved widget
// stays "verified"). The shield SVG stroke/fill/glyph are baked raw at mount (CSS
// vars don't reach SVG presentation attributes), so this is the load-bearing
// path for a live theme swap.

const LIGHT = buildWidgetShellSkin(null);
const DARK = buildWidgetShellSkin({ _theme: 'dark', primary: '#111111', glyph: '#ffffff', text_muted: '#555555' });
const EN = buildWidgetShell(null);
const AR = buildWidgetShell({ _lang: 'ar', _direction: 'rtl', simpleVerify: 'تحقق', simpleVerified: 'مُتحقَّق', brandName: 'كابوتشين', brandTag: 'لا بيانات' });

function mountPresentation(): { root: ShadowRoot; presentation: ReturnType<typeof createSimplePresentation> } {
  const host = document.createElement('div');
  const shadowHost = document.createElement('div');
  document.body.appendChild(shadowHost);
  const root = shadowHost.attachShadow({ mode: 'open' });
  const input: PresentationFactoryInput = {
    host,
    root,
    trigger: 'auto',
    width: 'auto',
    height: null,
    size: 'normal',
    shell: EN,
    skin: LIGHT,
    shellConfig: buildWidgetShellConfig(null),
  };
  const presentation = createSimplePresentation(input);
  presentation.mount();
  return { root, presentation };
}

describe('simple presentation applySkin (in place)', () => {
  it('recolors the verified shield + swaps the brand logo without a rebuild', () => {
    const { root, presentation } = mountPresentation();
    const shield = root.querySelector('[part="simple-shield-box"] path')!;
    const rootBefore = root.querySelector('[part="simple-checkbox"]');

    presentation.setState('verified');
    expect(shield.getAttribute('fill')).toBe(LIGHT.palette.primary);

    presentation.applySkin(DARK);
    // Same DOM node (in place, not rebuilt) → any solved/verified state survives.
    expect(root.querySelector('[part="simple-checkbox"]')).toBe(rootBefore);
    // Shield repainted for the CURRENT (verified) state with the new palette.
    expect(shield.getAttribute('fill')).toBe(DARK.palette.primary);
    expect(shield.getAttribute('stroke')).toBe(DARK.palette.primary);
    // Brand logo is a skin asset, not a CSS var → swapped explicitly.
    const logo = root.querySelector('[part="simple-brand-logo"] img')!;
    expect(logo.getAttribute('src')).toBe(DARK.palette.brand_logo);
  });

  it('recolors the idle shield stroke on a skin swap', () => {
    const { root, presentation } = mountPresentation();
    const shield = root.querySelector('[part="simple-shield-box"] path')!;
    // Passive (auto) idle stroke = text_passive; swap changes it via applyPalette.
    presentation.setState('idle');
    presentation.applySkin(DARK);
    expect(shield.getAttribute('stroke')).toBe(DARK.palette.text_passive);
  });
});

describe('simple presentation applyLocale (in place)', () => {
  it('re-labels the current state, re-texts the brand, and sets/removes dir', () => {
    const { root, presentation } = mountPresentation();
    const label = root.querySelector('[part="simple-checkbox-label"]')!;
    const wordmark = root.querySelector('[part="simple-brand-name"]')!;
    const rootDiv = root.querySelector('[part="simple-checkbox"]')!;

    presentation.setState('verified');
    presentation.applyLocale(AR);
    // Label reflects the CURRENT (verified) state in the new locale.
    expect(label.textContent).toBe(AR.strings.simpleVerified);
    expect(wordmark.textContent).toBe(AR.strings.brandName);
    expect(rootDiv.getAttribute('dir')).toBe('rtl');

    // rtl → ltr must DROP the stale dir attribute (regression: dir was only ever added).
    presentation.applyLocale(EN);
    expect(rootDiv.hasAttribute('dir')).toBe(false);
    expect(label.textContent).toBe(EN.strings.simpleVerified);
  });
});
