import type { ResolvedSkin, SkinPreset, SkinSchemaEntry } from '@caputchin/game-sdk';
import { resolveAssetUrl } from './url.js';
import { schemaTypeOf, validateSkinValue } from './types.js';

/** Hard cap on `_extends` chain depth. Cycles are also actively detected
 *  via a visited-set; the depth cap is a defensive ceiling against
 *  pathological linear chains. */
const MAX_EXTENDS_DEPTH = 8;

const MODE_LIGHT = 'light';
const MODE_DARK = 'dark';

type Mode = 'light' | 'dark';
type PresetMap = Record<string, SkinPreset>;
type SchemaMap = Record<string, SkinSchemaEntry>;

export interface ResolveSkinResult {
  resolved: ResolvedSkin | null;
  issues: string[];
}

/** Single options object for `resolveSkin`. Fewer positional arguments
 *  means callers can't accidentally swap `schema` and `attrValue` (both
 *  string-keyed at the type system level) or `prefersDark` and a missing
 *  boolean. */
export interface ResolveSkinInput {
  /** Manifest presets to resolve against. `null` / `undefined` / empty
   *  short-circuits to `{ resolved: null, issues: [] }`. */
  presets: PresetMap | null | undefined;
  /** Optional schema block from the manifest. Drives per-value type
   *  validation (color regex + per-type extension / MIME allow-list).
   *  Absent ⇒ values pass through unvalidated. */
  schema?: SchemaMap | null;
  /** Raw `skin` attribute value from the element. `null` / empty / `'auto'`
   *  cascade through the auto-resolver. */
  attrValue?: string | null;
  /** System `prefers-color-scheme: dark` reading. Element layer queries
   *  `matchMedia` once and passes the bool so the resolver stays pure. */
  prefersDark: boolean;
  /** Reject inline-JSON attribute values. The widget shell layer
   *  (`<caputchin-widget skin="…">`) sets this so authors are limited to
   *  mode shortcuts / preset names; inline JSON implies per-key overrides
   *  the bundled shell doesn't support. Detected inline JSON under this
   *  flag emits an issue and cascades to auto. */
  rejectInlineJson?: boolean;
  /** Bundle base URL for resolving bundle-relative asset paths. `null`
   *  leaves relative paths verbatim - the browser resolves them against
   *  the document origin when consumed. */
  baseUrl?: string | null;
}

function modeOf(preset: SkinPreset): Mode {
  return preset._theme === MODE_DARK ? MODE_DARK : MODE_LIGHT;
}

function findByName(presets: PresetMap, name: string): { name: string; preset: SkinPreset } | null {
  if (Object.prototype.hasOwnProperty.call(presets, name)) {
    return { name, preset: presets[name]! };
  }
  return null;
}

/** Find a preset matching the requested mode. Prefer `_default:true`
 *  winners; otherwise first declared. */
function findByMode(presets: PresetMap, mode: Mode): { name: string; preset: SkinPreset } | null {
  let firstMatch: { name: string; preset: SkinPreset } | null = null;
  for (const [name, preset] of Object.entries(presets)) {
    if (modeOf(preset) !== mode) continue;
    if (preset._default === true) return { name, preset };
    if (!firstMatch) firstMatch = { name, preset };
  }
  return firstMatch;
}

/** `_extends` target may be a preset name OR a mode shortcut (`light` /
 *  `dark`). The mode form resolves to that mode's `_default:true` preset
 *  (or first in that mode if no default), mirroring the `<skin-name>`
 *  vs `<mode>` distinction at the attribute layer. */
function lookupExtends(presets: PresetMap, target: string): { name: string; preset: SkinPreset } | null {
  const byName = findByName(presets, target);
  if (byName) return byName;
  if (target === MODE_LIGHT || target === MODE_DARK) {
    return findByMode(presets, target);
  }
  return null;
}

function buildChain(
  presets: PresetMap,
  leafName: string | null,
  leafPreset: SkinPreset,
  issues: string[],
): SkinPreset[] | null {
  const chain: SkinPreset[] = [leafPreset];
  const visited = new Set<string>();
  if (leafName !== null) visited.add(leafName);

  let current = leafPreset;
  let depth = 0;
  while (current._extends) {
    if (depth >= MAX_EXTENDS_DEPTH) {
      issues.push(`skin preset "${leafName ?? '<inline>'}" exceeded _extends depth ${MAX_EXTENDS_DEPTH}; falling through to auto`);
      return null;
    }
    const next = lookupExtends(presets, current._extends);
    if (!next) {
      issues.push(`skin preset "${leafName ?? '<inline>'}" extends "${current._extends}" which does not match any preset name or mode shortcut; falling through to auto`);
      return null;
    }
    if (visited.has(next.name)) {
      issues.push(`skin preset "${leafName ?? '<inline>'}" has a circular _extends chain via "${next.name}"; falling through to auto`);
      return null;
    }
    visited.add(next.name);
    chain.unshift(next.preset);
    current = next.preset;
    depth += 1;
  }
  return chain;
}

/** Flatten a chain (deepest ancestor first) into a single resolved object.
 *  `_theme` inherits from any preset in the chain (later wins); typed keys
 *  are validated against the schema and asset URLs are resolved against
 *  `baseUrl`. Invalid values are dropped + the offending key surfaces an
 *  issue. `_extends` and `_default` are stripped from the output. */
function flattenChain(
  chain: SkinPreset[],
  schema: SchemaMap | null,
  baseUrl: string | null,
  issues: string[],
  leafName: string | null,
): ResolvedSkin {
  const merged: Record<string, string> = {};
  let inheritedMode: Mode | undefined;

  for (const preset of chain) {
    if (preset._theme === MODE_LIGHT || preset._theme === MODE_DARK) {
      inheritedMode = preset._theme;
    }
    for (const [key, raw] of Object.entries(preset)) {
      if (key.startsWith('_')) continue;
      if (typeof raw !== 'string') continue;

      const declaredType = schema ? schemaTypeOf(schema[key]) : null;
      if (declaredType) {
        const verdict = validateSkinValue(declaredType, raw);
        if (!verdict.ok) {
          issues.push(`skin key "${key}" rejected in preset "${leafName ?? '<inline>'}": ${verdict.reason}`);
          delete merged[key];
          continue;
        }
        merged[key] = declaredType === 'color' ? raw : resolveAssetUrl(raw, baseUrl);
      } else {
        // No schema entry - pass through unvalidated. Authors who skip the
        // schema block opt out of type checking entirely.
        merged[key] = raw;
      }
    }
  }

  return { _theme: inheritedMode ?? MODE_LIGHT, ...merged };
}

function resolveLeaf(
  presets: PresetMap,
  schema: SchemaMap | null,
  baseUrl: string | null,
  leafName: string | null,
  leafPreset: SkinPreset,
  issues: string[],
): ResolvedSkin | null {
  const chain = buildChain(presets, leafName, leafPreset, issues);
  if (!chain) return null;
  return flattenChain(chain, schema, baseUrl, issues, leafName);
}

function resolveAuto(
  presets: PresetMap,
  schema: SchemaMap | null,
  baseUrl: string | null,
  prefersDark: boolean,
  issues: string[],
): ResolvedSkin | null {
  const primary: Mode = prefersDark ? MODE_DARK : MODE_LIGHT;
  const secondary: Mode = prefersDark ? MODE_LIGHT : MODE_DARK;

  const primaryHit = findByMode(presets, primary);
  if (primaryHit) return resolveLeaf(presets, schema, baseUrl, primaryHit.name, primaryHit.preset, issues);

  const secondaryHit = findByMode(presets, secondary);
  if (secondaryHit) return resolveLeaf(presets, schema, baseUrl, secondaryHit.name, secondaryHit.preset, issues);

  const firstName = Object.keys(presets)[0];
  if (firstName) {
    return resolveLeaf(presets, schema, baseUrl, firstName, presets[firstName]!, issues);
  }
  return null;
}

function tryParseInlineJson(attrValue: string, issues: string[]): SkinPreset | null {
  try {
    const parsed = JSON.parse(attrValue);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as SkinPreset;
    }
    issues.push('skin attribute parsed as non-object JSON; falling through to auto');
    return null;
  } catch (e) {
    issues.push(`skin attribute looked like JSON but failed to parse: ${(e as Error).message}; falling through to auto`);
    return null;
  }
}

/** Public entry point. Pure (no DOM, no `matchMedia` reads). Caller passes
 *  `prefersDark` from the system query and an optional `baseUrl` for
 *  bundle-relative asset path resolution. Returns the resolved skin
 *  object plus a list of human-readable issues the element layer
 *  translates into `invalid-config` events. */
export function resolveSkin(input: ResolveSkinInput): ResolveSkinResult {
  const { presets, schema, attrValue, prefersDark, rejectInlineJson, baseUrl: baseUrlOption } = input;
  const issues: string[] = [];
  const presetsMap = presets ?? {};
  const schemaMap = schema ?? null;
  const baseUrl = baseUrlOption ?? null;
  const presetNames = Object.keys(presetsMap);
  if (presetNames.length === 0) {
    return { resolved: null, issues };
  }

  const trimmed = (attrValue ?? '').trim();

  // Inline JSON path.
  if (trimmed.startsWith('{')) {
    if (rejectInlineJson) {
      issues.push('skin attribute on <caputchin-widget> does not accept inline JSON; pass a mode shortcut or preset name; falling through to auto');
      return { resolved: resolveAuto(presetsMap, schemaMap, baseUrl, prefersDark, issues), issues };
    }
    const inline = tryParseInlineJson(trimmed, issues);
    if (inline) {
      const hasExtends = typeof inline._extends === 'string' && inline._extends.length > 0;
      if (hasExtends) {
        const resolved = resolveLeaf(presetsMap, schemaMap, baseUrl, null, inline, issues);
        if (resolved) return { resolved, issues };
        // _extends target missing → fall through to layer-atop-auto below.
      }
      // Layer inline atop the auto-resolved base. Base is already a
      // validated, URL-resolved ResolvedSkin; we don't re-validate its
      // values. Inline's own keys ARE validated; invalid inline keys
      // surface an issue and leave the base value in place.
      //
      // When inline declares its own `_theme`, that mode drives the base
      // selection too - otherwise an inline `{_theme:'dark', primary:'#abc'}`
      // on a system in light mode would label the result `dark` while all
      // surrounding colors stayed light (mismatched payload). Inline
      // `_theme` is the customer's explicit pick; respect it through the
      // whole resolution.
      const inlineMode: Mode | undefined =
        inline._theme === MODE_LIGHT || inline._theme === MODE_DARK ? inline._theme : undefined;
      const basePrefersDark = inlineMode === MODE_DARK
        ? true
        : (inlineMode === MODE_LIGHT ? false : prefersDark);
      const base = resolveAuto(presetsMap, schemaMap, baseUrl, basePrefersDark, issues);
      const merged: Record<string, string> = {};
      if (base) {
        for (const [k, v] of Object.entries(base)) {
          if (k === '_theme') continue;
          if (typeof v === 'string') merged[k] = v;
        }
      }
      for (const [key, raw] of Object.entries(inline)) {
        if (key.startsWith('_')) continue;
        if (typeof raw !== 'string') continue;
        const declaredType = schemaMap ? schemaTypeOf(schemaMap[key]) : null;
        if (declaredType) {
          const verdict = validateSkinValue(declaredType, raw);
          if (!verdict.ok) {
            issues.push(`skin key "${key}" rejected in inline override: ${verdict.reason}`);
            continue;
          }
          merged[key] = declaredType === 'color' ? raw : resolveAssetUrl(raw, baseUrl);
        } else {
          merged[key] = raw;
        }
      }
      const resolvedMode: Mode = inlineMode ?? (base?._theme as Mode | undefined) ?? MODE_LIGHT;
      return { resolved: { _theme: resolvedMode, ...merged }, issues };
    }
    // Inline JSON failed; cascade.
    return { resolved: resolveAuto(presetsMap, schemaMap, baseUrl, prefersDark, issues), issues };
  }

  // Auto / 'auto' / empty.
  if (trimmed.length === 0 || trimmed.toLowerCase() === 'auto') {
    return { resolved: resolveAuto(presetsMap, schemaMap, baseUrl, prefersDark, issues), issues };
  }

  // Mode shortcut.
  if (trimmed === MODE_LIGHT || trimmed === MODE_DARK) {
    const hit = findByMode(presetsMap, trimmed);
    if (hit) {
      const resolved = resolveLeaf(presetsMap, schemaMap, baseUrl, hit.name, hit.preset, issues);
      if (resolved) return { resolved, issues };
    }
    issues.push(`skin="${trimmed}" matched no preset with _theme=${trimmed}; falling through to auto`);
    return { resolved: resolveAuto(presetsMap, schemaMap, baseUrl, prefersDark, issues), issues };
  }

  // Preset name (case-sensitive).
  const byName = findByName(presetsMap, trimmed);
  if (byName) {
    const resolved = resolveLeaf(presetsMap, schemaMap, baseUrl, byName.name, byName.preset, issues);
    if (resolved) return { resolved, issues };
    return { resolved: resolveAuto(presetsMap, schemaMap, baseUrl, prefersDark, issues), issues };
  }

  // Unknown value.
  issues.push(`skin="${trimmed}" did not match any preset name or mode shortcut; falling through to auto`);
  return { resolved: resolveAuto(presetsMap, schemaMap, baseUrl, prefersDark, issues), issues };
}
