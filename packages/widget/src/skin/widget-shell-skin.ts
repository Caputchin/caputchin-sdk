import type { ResolvedSkin, SkinPreset, SkinSchemaEntry } from '@caputchin/game-sdk';
import widgetManifest from '../../caputchin.json';
import { injectOverrideLayer } from '../bootstrap/cascade-merge.js';
import { resolveSkin } from './resolver.js';
// Brand SVGs are inlined as data URIs by tsup's dataurl loader at build
// time so the bundle stays self-contained. Sources live as editable .svg
// files in src/assets/; the loader turns each into `data:image/svg+xml;
// base64,…` we can drop into an <img src> directly.
import brandLogoLight from '../assets/logo-light.svg';
import brandLogoDark from '../assets/logo-dark.svg';

/** Keys present in the widget's bundled shell skin presets. Adding a new
 *  themable surface means adding it to caputchin.json AND extending this
 *  type so the rest of the codebase gets autocomplete + miss detection. */
export interface ShellPalette {
  primary: string;
  primary_hover: string;
  surface_bg: string;
  text_primary: string;
  text_label: string;
  text_muted: string;
  text_passive: string;
  border: string;
  glyph: string;
  error: string;
  shadow: string;
  modal_backdrop: string;
  fullscreen_backdrop: string;
  close_btn_bg: string;
  /** Color of the compact-mode separator dot in the brand strip. Lighter
   *  than `text_muted` so the dot reads as decorative punctuation, not as
   *  active text. */
  separator: string;
  brand_text: string;
  brand_text_hover: string;
  /** Brand mark asset. Resolved as an `image`-typed skin value - typically a
   *  `data:image/svg+xml;base64,…` URI in the bundled presets so the widget
   *  bundle stays self-contained. Customer-curated paid skins can swap to
   *  any allowed image URL via the same key. */
  brand_logo: string;
  // Index signature lets the palette flow straight into the
  // `Record<string, string>` writer in `css-vars.ts` without an `as unknown`
  // bounce, and accommodates customer-curated paid skins that add their own
  // keys. Named keys above still drive autocomplete + miss detection.
  [key: string]: string;
}

export interface WidgetShellSkin {
  theme: 'light' | 'dark';
  palette: ShellPalette;
  /** Human-readable issues raised during resolution. The element layer
   *  translates each into an `invalid-config` event so host pages can log
   *  misconfiguration. */
  issues: string[];
}

const PRESETS = (widgetManifest.skins?.presets ?? {}) as Record<string, SkinPreset>;
const SCHEMA = (widgetManifest.skins?.schema ?? null) as Record<string, SkinSchemaEntry> | null;

/** Last-ditch palette if the bundled manifest goes missing somehow.
 *  Derived from the JSON's `light` preset at module init so the two
 *  sources can't drift: editing caputchin.json automatically refreshes
 *  the fallback. Should never be hit in production; exists so the type
 *  system can express a non-null `palette` even on resolver failure. */
const HARDCODED_LIGHT: ShellPalette = {
  ...((PRESETS['light'] ?? {}) as Record<string, string>),
  // brand_logo isn't authored in caputchin.json (the JSON would balloon
  // ~30KB per logo if it were); it comes from the tsup-inlined SVG above.
  brand_logo: brandLogoLight,
} as ShellPalette;

const BRAND_LOGO_BY_THEME: Readonly<Record<'light' | 'dark', string>> = {
  light: brandLogoLight,
  dark: brandLogoDark,
};

function toPalette(resolved: ResolvedSkin | null, theme: 'light' | 'dark'): ShellPalette {
  if (!resolved) return { ...HARDCODED_LIGHT, brand_logo: BRAND_LOGO_BY_THEME[theme] };
  const out: ShellPalette = { ...HARDCODED_LIGHT };
  for (const key of Object.keys(HARDCODED_LIGHT) as Array<keyof ShellPalette>) {
    const value = resolved[key as string];
    if (typeof value === 'string') out[key] = value;
  }
  // Theme-matched brand logo applies when the resolved preset didn't carry
  // its own override. Customer-curated paid skins can override via the
  // `brand_logo` key in their preset and that wins via the loop above.
  if (typeof resolved['brand_logo'] !== 'string') {
    out.brand_logo = BRAND_LOGO_BY_THEME[theme];
  }
  return out;
}

/** Resolve the widget shell skin. Accepts the customer's `skin` attribute
 *  value (omitted/`"auto"` ⇒ system `prefers-color-scheme`). Inline JSON is
 *  rejected on `<caputchin-widget>` (per shell-attribute parity with
 *  `lang`); the game element pre-derives a theme hint from inline JSON and
 *  passes it as a bare string before reaching this resolver.
 *
 *  When `overridePresets` is supplied (from /api/v1/widget/bootstrap per
 *  ADR-0059), the override bank is injected atop the bundled bank before
 *  resolution; collisions implicitly extend their bundled twin. */
export function resolveWidgetShellSkin(
  attrValue?: string | null,
  prefersDark?: boolean,
  overridePresets?: Record<string, SkinPreset> | null,
): WidgetShellSkin {
  const dark = typeof prefersDark === 'boolean'
    ? prefersDark
    : (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false);
  const merged = injectOverrideLayer(PRESETS, overridePresets);
  const { resolved, issues } = resolveSkin({
    presets: merged,
    schema: SCHEMA,
    attrValue: attrValue ?? 'auto',
    prefersDark: dark,
    rejectInlineJson: true,
    baseUrl: null,
  });
  const theme: 'light' | 'dark' = resolved?._theme ?? 'light';
  return {
    theme,
    palette: toPalette(resolved, theme),
    issues,
  };
}
