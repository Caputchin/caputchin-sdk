// Visitor signals the widget reads from the browser and sends to the bootstrap
// for server-side resolution. The server resolves; the widget just supplies the
// signals + its explicit element attrs.

/** The visitor's primary navigator language (the auto-fallback). One value, not
 *  the full list, to bound the bootstrap edge-cache cardinality. */
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
