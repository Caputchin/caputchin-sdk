// Inject a customer-authored override preset bank on top of the bundled
// bank per ADR-0059's two-layer cascade rule. When an override preset name
// `X` collides with a bundled preset of the same name, the bundled preset
// is preserved under a namespaced alias and the override gets an implicit
// `_extends` to that alias unless it declares one. The downstream resolver
// then walks the merged map exactly as before; the override inherits the
// bundled preset's leaf keys for everything it does not declare.
//
// If the override declares its own `_extends`, that takes precedence; the
// chain walks the merged map's namespace, so override → other-override is
// resolved first, falling through to bundled on miss (the merged map
// contains both layers).

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

  const merged: Record<string, T> = { ...safeBundled };
  for (const [name, preset] of Object.entries(override)) {
    if (Object.prototype.hasOwnProperty.call(merged, name)) {
      // Same-name collision: preserve bundled under namespaced alias so the
      // override can implicitly extend it (and explicit `_extends` chains
      // can still reach it via the alias when needed).
      const aliasedName = `${BUNDLED_NAMESPACE_PREFIX}${name}`;
      merged[aliasedName] = merged[name]!;
      const hasExtends = typeof preset._extends === 'string' && preset._extends.length > 0;
      merged[name] = hasExtends
        ? preset
        : ({ ...preset, _extends: aliasedName } as T);
    } else {
      merged[name] = preset;
    }
  }
  return merged;
}
