import type { LanguagePreset, ResolvedLanguage } from '@caputchin/game-sdk';

/** ISO 639 primary tags whose scripts read right-to-left. Direction can
 *  always be set explicitly on a preset via `_direction`; this set is just
 *  the auto-derivation fallback. */
const RTL_LANGS: ReadonlySet<string> = new Set(['ar', 'he', 'fa', 'ur', 'yi', 'ps', 'sd']);

/** Hard cap on `_extends` chain depth. Cycles are also actively detected
 *  via a visited-set; the depth cap is a defensive ceiling against
 *  pathological linear chains. */
const MAX_EXTENDS_DEPTH = 8;

const ISO_FALLBACK = 'en';

export interface ResolveResult {
  resolved: ResolvedLanguage | null;
  issues: string[];
}

export interface ResolveOptions {
  /** Reject inline-JSON attribute values. The widget shell layer
   *  (`<caputchin-widget lang="…">`) sets this so authors are limited to
   *  ISO codes / preset names; inline JSON would imply per-string overrides
   *  the bundled shell doesn't support. Inline JSON detected under this
   *  flag emits an issue and cascades to browser-auto. */
  rejectInlineJson?: boolean;
}

type PresetMap = Record<string, LanguagePreset>;

function normalizeIso(iso: string): string {
  return iso.toLowerCase().split(/[-_]/)[0] ?? '';
}

function isRtl(iso: string): boolean {
  return RTL_LANGS.has(normalizeIso(iso));
}

function findByName(presets: PresetMap, name: string): { name: string; preset: LanguagePreset } | null {
  if (Object.prototype.hasOwnProperty.call(presets, name)) {
    return { name, preset: presets[name]! };
  }
  return null;
}

function findByIso(presets: PresetMap, iso: string): { name: string; preset: LanguagePreset } | null {
  const target = normalizeIso(iso);
  if (!target) return null;
  let firstMatch: { name: string; preset: LanguagePreset } | null = null;
  for (const [name, preset] of Object.entries(presets)) {
    const presetIso = preset._iso ? normalizeIso(preset._iso) : null;
    if (presetIso !== target) continue;
    if (preset._default === true) return { name, preset };
    if (!firstMatch) firstMatch = { name, preset };
  }
  return firstMatch;
}

function lookupExtends(presets: PresetMap, target: string): { name: string; preset: LanguagePreset } | null {
  return findByName(presets, target) ?? findByIso(presets, target);
}

/** Walk the `_extends` chain from leaf to root, building an ordered list
 *  of presets where index 0 is the deepest ancestor. Returns null when a
 *  cycle is detected or the depth cap is exceeded; issue is appended in
 *  the caller. Anonymous leaves (inline JSON) are passed in via
 *  `leafName=null`; they are not added to the visited set so a future
 *  preset of the same name can still resolve. */
function buildChain(
  presets: PresetMap,
  leafName: string | null,
  leafPreset: LanguagePreset,
  issues: string[],
): LanguagePreset[] | null {
  const chain: LanguagePreset[] = [leafPreset];
  const visited = new Set<string>();
  if (leafName !== null) visited.add(leafName);

  let current = leafPreset;
  let depth = 0;
  while (current._extends) {
    if (depth >= MAX_EXTENDS_DEPTH) {
      issues.push(`lang preset "${leafName ?? '<inline>'}" exceeded _extends depth ${MAX_EXTENDS_DEPTH}; falling through to auto`);
      return null;
    }
    const next = lookupExtends(presets, current._extends);
    if (!next) {
      issues.push(`lang preset "${leafName ?? '<inline>'}" extends "${current._extends}" which does not match any preset name or ISO code; falling through to auto`);
      return null;
    }
    if (visited.has(next.name)) {
      issues.push(`lang preset "${leafName ?? '<inline>'}" has a circular _extends chain via "${next.name}"; falling through to auto`);
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
 *  Metadata (`_iso`, `_direction`) inherits; text keys merge with each
 *  later (more specific) preset winning. `_extends` and `_default` are
 *  stripped from the output. */
function flattenChain(chain: LanguagePreset[]): ResolvedLanguage {
  const text: Record<string, string> = {};
  let inheritedIso: string | undefined;
  let inheritedDirection: 'ltr' | 'rtl' | undefined;

  for (const preset of chain) {
    if (typeof preset._iso === 'string' && preset._iso.length > 0) {
      inheritedIso = preset._iso;
    }
    if (preset._direction === 'ltr' || preset._direction === 'rtl') {
      inheritedDirection = preset._direction;
    }
    for (const [key, value] of Object.entries(preset)) {
      if (key.startsWith('_')) continue;
      if (typeof value === 'string') {
        text[key] = value;
      }
    }
  }

  const iso = (inheritedIso ?? ISO_FALLBACK).toLowerCase();
  const direction = inheritedDirection ?? (isRtl(iso) ? 'rtl' : 'ltr');

  return {
    _iso: iso,
    _direction: direction,
    ...text,
  };
}

function resolveLeaf(
  presets: PresetMap,
  leafName: string | null,
  leafPreset: LanguagePreset,
  issues: string[],
): ResolvedLanguage | null {
  const chain = buildChain(presets, leafName, leafPreset, issues);
  if (!chain) return null;
  return flattenChain(chain);
}

function resolveAuto(
  presets: PresetMap,
  navigatorLanguages: readonly string[],
  issues: string[],
): ResolvedLanguage | null {
  // Primary-subtag match against the first navigator language; "en-GB" → "en".
  const primary = navigatorLanguages[0];
  if (primary) {
    const isoHit = findByIso(presets, primary);
    if (isoHit) return resolveLeaf(presets, isoHit.name, isoHit.preset, issues);
  }
  // ISO=en fallback.
  const enHit = findByIso(presets, ISO_FALLBACK);
  if (enHit) return resolveLeaf(presets, enHit.name, enHit.preset, issues);
  // First declared preset.
  const firstName = Object.keys(presets)[0];
  if (firstName) {
    return resolveLeaf(presets, firstName, presets[firstName]!, issues);
  }
  return null;
}

function tryParseInlineJson(attrValue: string, issues: string[]): LanguagePreset | null {
  try {
    const parsed = JSON.parse(attrValue);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as LanguagePreset;
    }
    issues.push('lang attribute parsed as non-object JSON; falling through to auto');
    return null;
  } catch (e) {
    issues.push(`lang attribute looked like JSON but failed to parse: ${(e as Error).message}; falling through to auto`);
    return null;
  }
}

/** Public entry point. Pure (no DOM, no `navigator` reads). Caller passes
 *  `navigator.languages`. Returns the resolved language object plus a list
 *  of human-readable issues the element layer translates into
 *  `invalid-config` events. */
export function resolveLanguage(
  presets: PresetMap | null | undefined,
  attrValue: string | null | undefined,
  navigatorLanguages: readonly string[],
  options: ResolveOptions = {},
): ResolveResult {
  const issues: string[] = [];
  const presetsMap = presets ?? {};
  const presetNames = Object.keys(presetsMap);
  if (presetNames.length === 0) {
    return { resolved: null, issues };
  }

  const trimmed = (attrValue ?? '').trim();

  // Inline JSON path.
  if (trimmed.startsWith('{')) {
    if (options.rejectInlineJson) {
      issues.push('lang attribute on <caputchin-widget> does not accept inline JSON; pass a preset name or ISO code; falling through to auto');
      return { resolved: resolveAuto(presetsMap, navigatorLanguages, issues), issues };
    }
    const inline = tryParseInlineJson(trimmed, issues);
    if (inline) {
      // If inline declares `_extends`, resolve via that chain. If inline
      // omits `_extends` but declares `_iso`, treat the iso as an implicit
      // `_extends` so the resolved object inherits the matching preset's
      // text strings by default; the customer's inline keys still win
      // during chain flattening. Inline with neither falls through to the
      // layer-atop-auto path further down.
      const hasExtends = typeof inline._extends === 'string' && inline._extends.length > 0;
      const implicitExtends = !hasExtends && typeof inline._iso === 'string' && inline._iso.length > 0
        ? inline._iso
        : null;
      if (hasExtends || implicitExtends !== null) {
        const effective: LanguagePreset = implicitExtends !== null
          ? { ...inline, _extends: implicitExtends }
          : inline;
        const resolved = resolveLeaf(presetsMap, null, effective, issues);
        if (resolved) return { resolved, issues };
        // _extends / iso target missing → fall through to layer-atop-auto so
        // the customer still gets *something* visible (auto base + their
        // inline overrides). The missing-target issue is already on the
        // issues list from buildChain.
      }
      // Layer inline atop the auto-resolved base.
      const base = resolveAuto(presetsMap, navigatorLanguages, issues);
      const merged: Record<string, string> = {};
      if (base) {
        for (const [k, v] of Object.entries(base)) {
          if (typeof v === 'string') merged[k] = v;
        }
      }
      for (const [k, v] of Object.entries(inline)) {
        if (k === '_extends' || k === '_default') continue;
        if (typeof v === 'string') merged[k] = v;
      }
      const inlineIso = typeof inline._iso === 'string' ? inline._iso : merged['_iso'];
      const iso = (inlineIso ?? ISO_FALLBACK).toLowerCase();
      const direction = inline._direction === 'ltr' || inline._direction === 'rtl'
        ? inline._direction
        : (isRtl(iso) ? 'rtl' : 'ltr');
      const resolved: ResolvedLanguage = {
        ...merged,
        _iso: iso,
        _direction: direction,
      };
      return { resolved, issues };
    }
    // Inline JSON failed; cascade.
    return { resolved: resolveAuto(presetsMap, navigatorLanguages, issues), issues };
  }

  // Auto / "auto" / empty.
  if (trimmed.length === 0 || trimmed.toLowerCase() === 'auto') {
    return { resolved: resolveAuto(presetsMap, navigatorLanguages, issues), issues };
  }

  // Preset name (case-sensitive).
  const byName = findByName(presetsMap, trimmed);
  if (byName) {
    const resolved = resolveLeaf(presetsMap, byName.name, byName.preset, issues);
    if (resolved) return { resolved, issues };
    return { resolved: resolveAuto(presetsMap, navigatorLanguages, issues), issues };
  }

  // ISO code lookup (case-insensitive).
  const byIso = findByIso(presetsMap, trimmed);
  if (byIso) {
    const resolved = resolveLeaf(presetsMap, byIso.name, byIso.preset, issues);
    if (resolved) return { resolved, issues };
    return { resolved: resolveAuto(presetsMap, navigatorLanguages, issues), issues };
  }

  // Unknown value; warn and fall through.
  issues.push(`lang="${trimmed}" did not match any preset name or ISO code; falling through to auto`);
  return { resolved: resolveAuto(presetsMap, navigatorLanguages, issues), issues };
}
