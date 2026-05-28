import type { ConfigPreset, ResolvedConfig } from '@caputchin/game-sdk';
import widgetManifest from '../../caputchin.json';

// The SERVER resolves the shell configuration and sends the resolved preset;
// this module builds the typed WidgetShellConfig from it, with a bundled
// `default` fallback when the bootstrap failed / returned nothing.

/** Keys present in the widget's bundled configurations preset. */
export interface ShellConfig {
  home_link: string;
  legal_link: string;
}

export interface WidgetShellConfig {
  /** Pre-resolved configuration values. Used by simple.ts to set `href`s on
   *  the brand strip links. */
  values: ShellConfig;
  /** Reserved; resolution issues now surface server-side. */
  issues: string[];
}

const PRESETS = (widgetManifest.configurations?.presets ?? {}) as Record<string, ConfigPreset>;
const DEFAULT_PRESET = (PRESETS['default'] ?? {}) as Record<string, unknown>;

/** Bundled fallback from the `default` preset (so it can't drift); used only
 *  when the bootstrap returned no resolved config. */
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

/** Build the widget shell configuration from the server-resolved config. Null
 *  (bootstrap failed / no config resolved) → bundled `default` fallback. */
export function buildWidgetShellConfig(resolved: ResolvedConfig | null): WidgetShellConfig {
  return { values: toShellConfig(resolved), issues: [] };
}
