// Inject a customer-authored override preset bank on top of the bundled
// bank per ADR-0059's two-layer cascade rule. When an override preset name
// `X` collides with a bundled preset of the same name, the bundled preset
// is preserved under a namespaced alias and the override gets an implicit
// `_extends` to that alias unless it declares one. The downstream resolver
// then walks the merged map; the override inherits the bundled preset's
// leaf keys for everything it does not declare.
//
// If the override declares its own `_extends`, that takes precedence; the
// chain walks the merged map's namespace, so override → other-override is
// resolved first, falling through to bundled on miss (the merged map
// contains both layers).
//
// ITERATION ORDER (ADR-0059 amendment, default-selection is override-first):
// the merged map is built override-entries-first, then bundled-only
// presets, then aliased bundled at the tail. The downstream default scan
// (`findByLang` / `findByMode` / `findDefault`) returns the FIRST
// `_default: true` it meets, so override-first ordering makes a customer's
// marked default win its group over a bundled default of the same group —
// even when the customer's preset has a NEW name (not a same-name collision).
// Value precedence is unaffected: it rides on the `_extends` chain flatten
// (deepest ancestor first, leaf wins), which is independent of this order.

export const BUNDLED_NAMESPACE_PREFIX = '__cpt_bundled__:';

export interface PresetWithExtends {
  _extends?: string;
}

export function injectOverrideLayer<T extends PresetWithExtends>(
  bundled: Record<string, T> | null | undefined,
  override: Record<string, T> | null | undefined
): Record<string, T> {
  const safeBundled = bundled ?? {};
  if (!override || Object.keys(override).length === 0) return { ...safeBundled };

  const merged: Record<string, T> = {};
  const aliases: Record<string, T> = {};

  // 1. Override layer first — so its defaults (and first-declared fallback)
  //    are selected ahead of bundled.
  for (const [name, preset] of Object.entries(override)) {
    if (Object.prototype.hasOwnProperty.call(safeBundled, name)) {
      // Same-name collision: preserve bundled under a namespaced alias so
      // the override can implicitly extend it (and explicit `_extends`
      // chains can still reach it via the alias when needed).
      const aliasedName = `${BUNDLED_NAMESPACE_PREFIX}${name}`;
      aliases[aliasedName] = safeBundled[name]!;
      const hasExtends = typeof preset._extends === 'string' && preset._extends.length > 0;
      merged[name] = hasExtends
        ? preset
        : ({ ...preset, _extends: aliasedName } as T);
    } else {
      merged[name] = preset;
    }
  }
  // 2. Bundled presets the override did not collide with keep their names.
  for (const [name, preset] of Object.entries(safeBundled)) {
    if (!Object.prototype.hasOwnProperty.call(override, name)) {
      merged[name] = preset;
    }
  }
  // 3. Aliased bundled (collided) at the tail — reachable by `_extends`
  //    for value inheritance, but iterated last so override defaults win
  //    selection.
  return { ...merged, ...aliases };
}
