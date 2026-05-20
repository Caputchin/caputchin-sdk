import type { ResolvedLanguage } from '@caputchin/game-sdk';
import widgetManifest from '../../caputchin.json';
import { resolveLanguage } from './resolver.js';

/** Keys present in the widget's bundled chrome presets. Adding a new
 *  user-visible string means adding it to caputchin.json AND extending this
 *  type so the rest of the codebase gets autocomplete + miss detection. */
export interface ChromeStrings {
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

export interface ChromeResolved {
  direction: 'ltr' | 'rtl';
  iso: string;
  strings: ChromeStrings;
}

const PRESETS = widgetManifest.languages?.presets ?? {};

const HARDCODED_FALLBACK: ChromeStrings = {
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

function toStrings(resolved: ResolvedLanguage | null): ChromeStrings {
  if (!resolved) return HARDCODED_FALLBACK;
  const out = { ...HARDCODED_FALLBACK };
  for (const key of Object.keys(HARDCODED_FALLBACK) as Array<keyof ChromeStrings>) {
    const value = resolved[key as string];
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

/** Resolve the widget chrome's own language pack. No `lang` attribute on
 *  the widget at MVP; resolution is browser-auto only. Future white-label
 *  layer overrides via a per-site-key fetch (not wired yet). */
function readNavigatorLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages && navigator.languages.length > 0) return navigator.languages;
  if (navigator.language) return [navigator.language];
  return [];
}

export function resolveWidgetChrome(navLangs?: readonly string[]): ChromeResolved {
  const languages = navLangs ?? readNavigatorLanguages();
  const { resolved } = resolveLanguage(PRESETS, 'auto', languages);
  return {
    direction: resolved?._direction ?? 'ltr',
    iso: resolved?._iso ?? 'en',
    strings: toStrings(resolved),
  };
}
