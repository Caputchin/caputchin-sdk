import type { LocalePreset, ResolvedLocale } from '@caputchin/game-sdk';
import widgetManifest from '../../caputchin.json';
import { injectOverrideLayer } from '../bootstrap/cascade-merge.js';
import { resolveLocale } from './resolver.js';

/** Keys present in the widget's bundled shell presets. Adding a new
 *  user-visible string means adding it to caputchin.json AND extending this
 *  type so the rest of the codebase gets autocomplete + miss detection. */
export interface ShellStrings {
  simpleVerify: string;
  simpleVerifying: string;
  simpleVerified: string;
  simpleFailed: string;
  brandName: string;
  brandTag: string;
  simpleAriaCheckbox: string;
  simpleAriaStatus: string;
  overlayClose: string;
}

export interface WidgetShell {
  direction: 'ltr' | 'rtl';
  lang: string;
  strings: ShellStrings;
  /** Human-readable issues raised during resolution (unknown preset name,
   *  unsupported inline JSON, etc.). The element layer translates each into
   *  an `invalid-config` event so host pages can log misconfiguration. */
  issues: string[];
}

const PRESETS = widgetManifest.locales?.presets ?? {};

const HARDCODED_FALLBACK: ShellStrings = {
  simpleVerify: 'Verify',
  simpleVerifying: 'Verifying…',
  simpleVerified: 'Verified',
  simpleFailed: 'Failed',
  brandName: 'Caputchin',
  brandTag: 'see no data',
  simpleAriaCheckbox: 'Verify you are human',
  simpleAriaStatus: 'Caputchin verification status',
  overlayClose: 'Close',
};

function toStrings(resolved: ResolvedLocale | null): ShellStrings {
  if (!resolved) return HARDCODED_FALLBACK;
  const out = { ...HARDCODED_FALLBACK };
  for (const key of Object.keys(HARDCODED_FALLBACK) as Array<keyof ShellStrings>) {
    const value = resolved[key as string];
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

function readNavigatorLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages && navigator.languages.length > 0) return navigator.languages;
  if (navigator.language) return [navigator.language];
  return [];
}

/** Resolve the widget shell language pack. Accepts the customer's `lang`
 *  attribute value (omitted/`"auto"` ⇒ browser-auto). Inline JSON is
 *  rejected on the widget (parity decision: shell strings are bundled, so
 *  per-string overrides go through manifest authoring, not the element
 *  attribute). Unknown preset / ISO ⇒ issue + browser-auto fallback.
 *
 *  When `overridePresets` is supplied (from /api/v1/widget/bootstrap per
 *  ADR-0059), the override bank is injected as a second layer atop the
 *  bundled bank before resolution; name-collision presets implicitly
 *  extend their bundled twin so the override only needs to declare the
 *  leaf keys it changes. */
export function resolveWidgetShell(
  attrValue?: string | null,
  navLangs?: readonly string[],
  overridePresets?: Record<string, LocalePreset> | null,
): WidgetShell {
  const languages = navLangs ?? readNavigatorLanguages();
  const merged = injectOverrideLayer(PRESETS as Record<string, LocalePreset>, overridePresets);
  const { resolved, issues } = resolveLocale(
    merged,
    attrValue ?? 'auto',
    languages,
    { rejectInlineJson: true },
  );
  return {
    direction: resolved?._direction ?? 'ltr',
    lang: resolved?._lang ?? 'en',
    strings: toStrings(resolved),
    issues,
  };
}
