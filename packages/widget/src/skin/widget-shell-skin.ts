import type { ResolvedSkin } from '@caputchin/game-sdk';
import widgetManifest from '../../caputchin.json';
// Brand SVGs are inlined as data URIs by tsup's dataurl loader at build time so
// the bundle stays self-contained. The brand_logo is NOT server-resolved (the
// JSON would balloon ~30KB per logo); the widget injects the theme-matched logo
// into the server-resolved palette here.
import brandLogoLight from '../assets/logo-light.svg';
import brandLogoDark from '../assets/logo-dark.svg';

// The SERVER resolves the shell skin and sends the resolved preset; this module
// builds the typed WidgetShellSkin from it (and injects the theme-matched brand
// logo), with a bundled light or dark fallback (matching the skin signal) when
// the bootstrap failed / returned nothing.

/** Keys present in the widget's bundled shell skin presets. */
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
  separator: string;
  brand_text: string;
  brand_text_hover: string;
  /** Brand mark asset (tsup-inlined data URI by theme; customer paid skins can
   *  override via the `brand_logo` key, which wins). */
  brand_logo: string;
  // Index signature lets the palette flow straight into the css-vars writer and
  // accommodates customer-curated paid-skin keys.
  [key: string]: string;
}

export interface WidgetShellSkin {
  theme: 'light' | 'dark';
  palette: ShellPalette;
  /** Reserved; resolution issues now surface server-side. */
  issues: string[];
}

const PRESETS = (widgetManifest.skins?.presets ?? {}) as Record<string, Record<string, unknown>>;

const BRAND_LOGO_BY_THEME: Readonly<Record<'light' | 'dark', string>> = {
  light: brandLogoLight,
  dark: brandLogoDark,
};

/** A bundled preset (derived from caputchin.json so it can't drift) with its
 *  theme-matched brand logo injected. */
function bundledPreset(name: 'light' | 'dark'): ShellPalette {
  return {
    ...((PRESETS[name] ?? {}) as Record<string, string>),
    brand_logo: BRAND_LOGO_BY_THEME[name],
  } as ShellPalette;
}

/** Bundled light palette: the key set a resolved skin is read against. */
const HARDCODED_LIGHT: ShellPalette = bundledPreset('light');

/** Bundled fallback presets, used only when the bootstrap returned no resolved
 *  skin (degraded / gated mount). */
const FALLBACK_BY_THEME: Readonly<Record<'light' | 'dark', ShellPalette>> = {
  light: HARDCODED_LIGHT,
  dark: bundledPreset('dark'),
};

/** The bundled fallback theme for a skin signal (`resolveSkinSignal` output).
 *  Only the bundled preset names map; a custom preset name has no bundled copy
 *  and its theme is unknown without the server, so it falls back to light. */
function fallbackTheme(skinSignal: string | null | undefined): 'light' | 'dark' {
  return skinSignal?.trim().toLowerCase() === 'dark' ? 'dark' : 'light';
}

function toPalette(resolved: ResolvedSkin, theme: 'light' | 'dark'): ShellPalette {
  const out: ShellPalette = { ...HARDCODED_LIGHT };
  for (const key of Object.keys(HARDCODED_LIGHT) as Array<keyof ShellPalette>) {
    const value = resolved[key as string];
    if (typeof value === 'string') out[key] = value;
  }
  // Theme-matched brand logo unless the resolved preset overrode it.
  if (typeof resolved['brand_logo'] !== 'string') {
    out.brand_logo = BRAND_LOGO_BY_THEME[theme];
  }
  return out;
}

/** Build the widget shell skin from the server-resolved skin. Null (bootstrap
 *  failed / no skin resolved) → the bundled preset matching `skinSignal` (the
 *  value the element sent to the bootstrap): `dark` → bundled dark, anything
 *  else → bundled light. */
export function buildWidgetShellSkin(
  resolved: ResolvedSkin | null,
  skinSignal?: string | null,
): WidgetShellSkin {
  if (!resolved) {
    const theme = fallbackTheme(skinSignal);
    return { theme, palette: { ...FALLBACK_BY_THEME[theme] }, issues: [] };
  }
  const theme: 'light' | 'dark' = resolved._theme ?? 'light';
  return { theme, palette: toPalette(resolved, theme), issues: [] };
}
