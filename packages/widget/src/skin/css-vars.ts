/** Write a resolved skin palette as CSS custom properties onto the given
 *  shadow root host (or a regular element). Keys are prefixed `--cpt-skin-`
 *  so the modes' template literals can `var(--cpt-skin-primary)` etc.
 *
 *  Idempotent: re-calling overwrites existing values. Variables are set on
 *  the shadow host's :host equivalent — for ShadowRoot we set on the root's
 *  host element so descendant CSS rules in the shadow tree resolve against
 *  `:host`. SVG presentation attributes (stroke / fill) don't read CSS vars
 *  at all and must be set with the raw color string by the caller. */
export function applySkinVars(
  target: ShadowRoot | HTMLElement,
  palette: Readonly<Record<string, string>>,
): void {
  const styleHost: HTMLElement | null = isShadowRoot(target)
    ? (target.host as HTMLElement)
    : target;
  if (!styleHost) return;
  for (const [key, value] of Object.entries(palette)) {
    styleHost.style.setProperty(`--cpt-skin-${key}`, value);
  }
}

function isShadowRoot(node: ShadowRoot | HTMLElement): node is ShadowRoot {
  return typeof (node as ShadowRoot).host !== 'undefined'
    && (node as ShadowRoot).host instanceof Element;
}
