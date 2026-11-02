// Visitor signal readers + the auto-detect step the elements run BEFORE the
// bootstrap call. When the `locale` / `skin` attribute is missing (or set to
// `auto`), the element falls back to the navigator's primary language / the
// `prefers-color-scheme: dark` media query and sends THAT concrete value to
// the server, so the bootstrap always receives one resolution input per axis.

import widgetManifest from '../../caputchin.json';

/** At most this many navigator languages follow the primary one. */
const MAX_NEXT_LANGS = 2;

/** The key two language tags must share to count as the same language: the
 *  base subtag, except Chinese, which keys on its script (`zh-TW` → `zh-hant`,
 *  `zh-CN` → `zh-hans`), because Traditional is never served from Simplified.
 *  Same rule as the server's matcher (caputchin-platform
 *  packages/core/src/accept-language.ts `languageMatchKey`). */
function languageMatchKey(tag: string): string {
  const subtags = tag.trim().toLowerCase().split(/[-_]/);
  const base = subtags[0] ?? '';
  if (base !== 'zh') return base;
  const rest = subtags.slice(1);
  if (rest.includes('hant')) return 'zh-hant';
  if (rest.includes('hans')) return 'zh-hans';
  return rest.some((s) => s === 'tw' || s === 'hk' || s === 'mo') ? 'zh-hant' : 'zh-hans';
}

/** The languages the bundled shell ships, by match key. */
const SHIPPED_LANGS: ReadonlySet<string> = new Set(
  Object.values(widgetManifest.locales.presets).map((preset) => languageMatchKey(preset._lang)),
);

/** The visitor's primary navigator language. One value, not the full list, to
 *  bound the bootstrap edge-cache cardinality. */
export function readNavLang(): string | null {
  if (typeof navigator === 'undefined') return null;
  if (navigator.languages && navigator.languages.length > 0) return navigator.languages[0]!;
  return navigator.language || null;
}

/** Whether the visitor's OS/browser prefers a dark color scheme. */
export function readPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

/** Treat null/undefined/empty/`auto` as "no attribute set" (the element falls
 *  back to the visitor signal in those cases). */
function isAttrMissing(attr: string | null | undefined): boolean {
  if (attr === null || attr === undefined) return true;
  const trimmed = attr.trim();
  return trimmed === '' || trimmed.toLowerCase() === 'auto';
}

/** The locale the element sends to the bootstrap: the explicit attribute when
 *  set, otherwise the navigator's primary language. Null when neither is
 *  available (the server falls back to the bundled default). */
export function resolveLocaleSignal(attr: string | null | undefined): string | null {
  if (!isAttrMissing(attr)) return attr as string;
  return readNavLang();
}

/** The navigator languages after the primary one (at most two), sent only when
 *  the `locale` attribute is missing and the shell ships no language for the
 *  primary one (a `zh-TW, ja` visitor sends `ja`), so the server can serve the
 *  visitor's next language before English. Null otherwise, which keeps the
 *  bootstrap cache key to one language for every visitor the shell already
 *  speaks to. */
export function resolveNextLangsSignal(attr: string | null | undefined): string[] | null {
  if (!isAttrMissing(attr) || typeof navigator === 'undefined') return null;
  const langs = navigator.languages ?? [];
  const primary = langs[0];
  if (!primary || SHIPPED_LANGS.has(languageMatchKey(primary))) return null;
  const next = langs.slice(1, 1 + MAX_NEXT_LANGS);
  return next.length > 0 ? next : null;
}

/** The skin the element sends to the bootstrap: the explicit attribute when
 *  set, otherwise `light` / `dark` derived from `prefers-color-scheme`. */
export function resolveSkinSignal(attr: string | null | undefined): string {
  if (!isAttrMissing(attr)) return attr as string;
  return readPrefersDark() ? 'dark' : 'light';
}
