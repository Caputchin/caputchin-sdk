import type { ConfigPreset, ConfigSchemaEntry, ResolvedConfig } from '@caputchin/game-sdk';
import widgetManifest from '../../caputchin.json';
import { injectOverrideLayer } from '../bootstrap/cascade-merge.js';
import { resolveConfig } from './resolver.js';

/** Keys present in the widget's bundled configurations preset. Adding a new
 *  themable surface means adding it to caputchin.json AND extending this
 *  type so the rest of the codebase gets autocomplete + miss detection. */
export interface ShellConfig {
  home_link: string;
  legal_link: string;
}

export interface WidgetShellConfig {
  /** Pre-resolved configuration values. Used by simple.ts to set `href`s on
   *  the brand strip links. */
  values: ShellConfig;
  issues: string[];
}

const PRESETS = (widgetManifest.configurations?.presets ?? {}) as Record<string, ConfigPreset>;
const SCHEMA = (widgetManifest.configurations?.schema ?? null) as Record<string, ConfigSchemaEntry> | null;

/** Last-ditch values if the bundled manifest goes missing somehow. Derived
 *  from the JSON's `default` preset at module init so the two sources
 *  can't drift: editing caputchin.json automatically refreshes the
 *  fallback. Should never be hit in production; exists so the type system
 *  can express a non-null `values` even on resolver failure. */
const DEFAULT_PRESET = (PRESETS['default'] ?? {}) as Record<string, unknown>;
const HARDCODED_DEFAULT: ShellConfig = {
  home_link: typeof DEFAULT_PRESET['home_link'] === 'string' ? DEFAULT_PRESET['home_link'] : 'https://caputchin.com',
  legal_link: typeof DEFAULT_PRESET['legal_link'] === 'string' ? DEFAULT_PRESET['legal_link'] : 'https://caputchin.com/legal',
};

function toShellConfig(resolved: ResolvedConfig | null): ShellConfig {
  if (!resolved) return { ...HARDCODED_DEFAULT };
  const out: ShellConfig = { ...HARDCODED_DEFAULT };
  if (typeof resolved['home_link'] === 'string') out.home_link = resolved['home_link'];
  if (typeof resolved['legal_link'] === 'string') out.legal_link = resolved['legal_link'];
  return out;
}

/** Resolve the widget shell configuration. Accepts the customer's `config`
 *  attribute value (omitted/`"auto"` → bundled `default` preset). Inline
 *  JSON is rejected on `<caputchin-widget>` (parity with lang + skin).
 *
 *  When `overridePresets` is supplied (from /api/v1/widget/bootstrap per
 *  ADR-0059), the override bank is injected atop the bundled bank before
 *  resolution; collisions implicitly extend their bundled twin. */
export function resolveWidgetShellConfig(
  attrValue?: string | null,
  overridePresets?: Record<string, ConfigPreset> | null,
): WidgetShellConfig {
  const merged = injectOverrideLayer(PRESETS, overridePresets);
  const { resolved, issues } = resolveConfig({
    presets: merged,
    schema: SCHEMA,
    attrValue: attrValue ?? 'auto',
    rejectInlineJson: true,
  });
  return {
    values: toShellConfig(resolved),
    issues,
  };
}
