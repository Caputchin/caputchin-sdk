// Wire types for /api/v1/widget/bootstrap. Kept local to the
// widget so this package does not depend on apps/web. The server-side
// equivalents live in @caputchin/api-schemas (runtime/schemas.ts) and the two
// shapes must stay byte-compatible — drift breaks the override pipeline
// silently.

export interface OverridePresetBank {
  schema?: Record<string, unknown>;
  presets: Record<string, Record<string, unknown>>;
}

export interface OverridesPerAxis {
  locale: OverridePresetBank | null;
  skin: OverridePresetBank | null;
  configuration: OverridePresetBank | null;
}

export interface BootstrapWidgetBlock {
  overrides: OverridesPerAxis;
}

export interface BootstrapGameBlock {
  url: string | null;
  integrity: string | null;
  overrides: OverridesPerAxis | null;
}

export interface BootstrapResponse {
  widget: BootstrapWidgetBlock | null;
  game: BootstrapGameBlock | null;
}
