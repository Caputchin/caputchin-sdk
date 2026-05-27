import type { ConfigPreset, ConfigSchemaEntry, ResolvedConfig } from '@caputchin/game-sdk';
import { normalizeSchemaEntry, validateConfigValue } from './types.js';

/** Hard cap on `_extends` chain depth. Cycles are also actively detected
 *  via a visited-set; the depth cap is a defensive ceiling against
 *  pathological linear chains. Same shape as lang and skin. */
const MAX_EXTENDS_DEPTH = 8;

type PresetMap = Record<string, ConfigPreset>;
type SchemaMap = Record<string, ConfigSchemaEntry>;

export interface ResolveConfigResult {
  resolved: ResolvedConfig | null;
  issues: string[];
}

/** Single options object. Same shape model as the skin resolver, minus the
 *  mode dimension (configurations have no `prefers-color-scheme` analog)
 *  and minus the `baseUrl` (configurations carry typed scalars, not asset
 *  paths). */
export interface ResolveConfigInput {
  presets: PresetMap | null | undefined;
  schema?: SchemaMap | null;
  attrValue?: string | null;
  /** Reject inline-JSON attribute values. The widget shell layer
   *  (`<caputchin-widget config="…">`) sets this so authors are limited to
   *  preset names; inline JSON implies per-key overrides the bundled
   *  widget config doesn't support. */
  rejectInlineJson?: boolean;
}

function findByName(presets: PresetMap, name: string): { name: string; preset: ConfigPreset } | null {
  if (Object.prototype.hasOwnProperty.call(presets, name)) {
    return { name, preset: presets[name]! };
  }
  return null;
}

function findDefault(presets: PresetMap): { name: string; preset: ConfigPreset } | null {
  let firstMatch: { name: string; preset: ConfigPreset } | null = null;
  for (const [name, preset] of Object.entries(presets)) {
    if (preset._default === true) return { name, preset };
    if (!firstMatch) firstMatch = { name, preset };
  }
  return firstMatch;
}

function buildChain(
  presets: PresetMap,
  leafName: string | null,
  leafPreset: ConfigPreset,
  issues: string[],
): ConfigPreset[] | null {
  const chain: ConfigPreset[] = [leafPreset];
  const visited = new Set<string>();
  if (leafName !== null) visited.add(leafName);

  let current = leafPreset;
  let depth = 0;
  while (current._extends) {
    if (depth >= MAX_EXTENDS_DEPTH) {
      issues.push(`config preset "${leafName ?? '<inline>'}" exceeded _extends depth ${MAX_EXTENDS_DEPTH}; falling through to auto`);
      return null;
    }
    const next = findByName(presets, current._extends);
    if (!next) {
      issues.push(`config preset "${leafName ?? '<inline>'}" extends "${current._extends}" which does not match any preset name; falling through to auto`);
      return null;
    }
    if (visited.has(next.name)) {
      issues.push(`config preset "${leafName ?? '<inline>'}" has a circular _extends chain via "${next.name}"; falling through to auto`);
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
 *  Typed keys are validated against the schema; invalid values are dropped
 *  + the offending key surfaces an issue. `_extends` and `_default` are
 *  stripped from the output. */
function flattenChain(
  chain: ConfigPreset[],
  schema: SchemaMap | null,
  issues: string[],
  leafName: string | null,
): ResolvedConfig {
  const merged: Record<string, string | boolean | number> = {};
  for (const preset of chain) {
    for (const [key, raw] of Object.entries(preset)) {
      if (key.startsWith('_')) continue;
      if (raw === undefined) continue;
      const declaredEntry = schema ? normalizeSchemaEntry(schema[key]) : null;
      if (declaredEntry) {
        const verdict = validateConfigValue(declaredEntry, raw);
        if (!verdict.ok) {
          issues.push(`config key "${key}" rejected in preset "${leafName ?? '<inline>'}": ${verdict.reason}`);
          delete merged[key];
          continue;
        }
        merged[key] = raw;
      } else {
        // No schema entry: pass through unvalidated. Same lenient posture
        // as the skin resolver for unrecognized keys.
        if (typeof raw === 'string' || typeof raw === 'boolean' || typeof raw === 'number') {
          merged[key] = raw;
        }
      }
    }
  }
  return merged;
}

function resolveLeaf(
  presets: PresetMap,
  schema: SchemaMap | null,
  leafName: string | null,
  leafPreset: ConfigPreset,
  issues: string[],
): ResolvedConfig | null {
  const chain = buildChain(presets, leafName, leafPreset, issues);
  if (!chain) return null;
  return flattenChain(chain, schema, issues, leafName);
}

function resolveAuto(
  presets: PresetMap,
  schema: SchemaMap | null,
  issues: string[],
): ResolvedConfig | null {
  const hit = findDefault(presets);
  if (!hit) return null;
  return resolveLeaf(presets, schema, hit.name, hit.preset, issues);
}

function tryParseInlineJson(attrValue: string, issues: string[]): ConfigPreset | null {
  try {
    const parsed = JSON.parse(attrValue);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ConfigPreset;
    }
    issues.push('config attribute parsed as non-object JSON; falling through to auto');
    return null;
  } catch (e) {
    issues.push(`config attribute looked like JSON but failed to parse: ${(e as Error).message}; falling through to auto`);
    return null;
  }
}

/** Public entry point. Pure. Returns the resolved config object plus a list
 *  of human-readable issues the element layer translates into
 *  `invalid-config` events. */
export function resolveConfig(input: ResolveConfigInput): ResolveConfigResult {
  const { presets, schema, attrValue, rejectInlineJson } = input;
  const issues: string[] = [];
  const presetsMap = presets ?? {};
  const schemaMap = schema ?? null;
  const presetNames = Object.keys(presetsMap);
  if (presetNames.length === 0) {
    return { resolved: null, issues };
  }

  const trimmed = (attrValue ?? '').trim();

  // Inline JSON path.
  if (trimmed.startsWith('{')) {
    if (rejectInlineJson) {
      issues.push('config attribute on <caputchin-widget> does not accept inline JSON; pass a preset name or "auto"; falling through to auto');
      return { resolved: resolveAuto(presetsMap, schemaMap, issues), issues };
    }
    const inline = tryParseInlineJson(trimmed, issues);
    if (inline) {
      const hasExtends = typeof inline._extends === 'string' && inline._extends.length > 0;
      if (hasExtends) {
        const resolved = resolveLeaf(presetsMap, schemaMap, null, inline, issues);
        if (resolved) return { resolved, issues };
        // _extends target missing: fall through to layer-atop-auto below.
      }
      // Layer inline atop the auto-resolved base. Base values are already
      // validated; inline keys re-validate (invalid ones surface an issue
      // and leave the base value in place).
      const base = resolveAuto(presetsMap, schemaMap, issues);
      const merged: Record<string, string | boolean | number> = base ? { ...base } : {};
      for (const [key, raw] of Object.entries(inline)) {
        if (key.startsWith('_')) continue;
        if (raw === undefined) continue;
        const declaredEntry = schemaMap ? normalizeSchemaEntry(schemaMap[key]) : null;
        if (declaredEntry) {
          const verdict = validateConfigValue(declaredEntry, raw);
          if (!verdict.ok) {
            issues.push(`config key "${key}" rejected in inline override: ${verdict.reason}`);
            continue;
          }
          merged[key] = raw;
        } else if (typeof raw === 'string' || typeof raw === 'boolean' || typeof raw === 'number') {
          merged[key] = raw;
        }
      }
      return { resolved: merged, issues };
    }
    return { resolved: resolveAuto(presetsMap, schemaMap, issues), issues };
  }

  // Auto / 'auto' / empty.
  //
  // Case-sensitivity rule (intentional, parity with lang + skin resolvers):
  // the `'auto'` magic keyword is matched case-insensitively because it's a
  // fixed reserved token customers shouldn't have to memorize the exact
  // casing of. Preset names below are matched case-sensitively because
  // they're author-defined identifiers and a case-folded match would
  // silently collide with two presets that differ only in case (`Default`
  // vs `default`). Different concepts, different rules; same site.
  if (trimmed.length === 0 || trimmed.toLowerCase() === 'auto') {
    return { resolved: resolveAuto(presetsMap, schemaMap, issues), issues };
  }

  // Preset name (case-sensitive - see comment above).
  const byName = findByName(presetsMap, trimmed);
  if (byName) {
    const resolved = resolveLeaf(presetsMap, schemaMap, byName.name, byName.preset, issues);
    if (resolved) return { resolved, issues };
    return { resolved: resolveAuto(presetsMap, schemaMap, issues), issues };
  }

  // Unknown value.
  issues.push(`config="${trimmed}" did not match any preset name; falling through to auto`);
  return { resolved: resolveAuto(presetsMap, schemaMap, issues), issues };
}
