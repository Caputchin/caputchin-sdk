import type { ResolvedLocale } from '@caputchin/game-sdk';

// The SERVER resolves the shell locale and sends the resolved preset in the
// bootstrap response. This module no longer resolves; it just builds the typed
// WidgetShell from the server-resolved locale (or the bundled English fallback
// when the bootstrap failed / returned nothing).

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
  /** Accessible name (the `title` attribute) for the game challenge iframe,
   *  announced when a screen reader enters the embedded challenge. */
  frameTitle: string;
}

export interface WidgetShell {
  direction: 'ltr' | 'rtl';
  lang: string;
  strings: ShellStrings;
  /** Reserved for build-time issues; resolution issues now surface server-side. */
  issues: string[];
}

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
  frameTitle: 'Caputchin verification challenge',
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

/** Build the widget shell language pack from the server-resolved locale.
 *  Null (bootstrap failed / no locale resolved) → bundled English fallback. */
export function buildWidgetShell(resolved: ResolvedLocale | null): WidgetShell {
  return {
    direction: resolved?._direction ?? 'ltr',
    lang: resolved?._lang ?? 'en',
    strings: toStrings(resolved),
    issues: [],
  };
}
