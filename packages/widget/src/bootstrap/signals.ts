// Visitor signal readers + the auto-detect step the elements run BEFORE the
// bootstrap call. When the `locale` / `skin` attribute is missing (or set to
// `auto`), the element falls back to the navigator's primary language / the
// `prefers-color-scheme: dark` media query and sends THAT concrete value to
// the server, so the bootstrap always receives one resolution input per axis.

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

/** The skin the element sends to the bootstrap: the explicit attribute when
 *  set, otherwise `light` / `dark` derived from `prefers-color-scheme`. */
export function resolveSkinSignal(attr: string | null | undefined): string {
  if (!isAttrMissing(attr)) return attr as string;
  return readPrefersDark() ? 'dark' : 'light';
}
