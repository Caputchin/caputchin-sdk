// Wire types for /api/v1/widget/bootstrap. Kept local to the
// widget so this package does not depend on apps/web. The server-side
// equivalents live in @caputchin/api-schemas (runtime/schemas.ts) and the two
// shapes must stay byte-compatible - drift breaks the override pipeline
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
  // Server-validated-replay artifact (ADR-0069). Present for byte-compatibility
  // with the runtime schema (api-schemas runtime/schemas.ts); the widget itself
  // loads `url` (model A) and never reads these; the server replays runUrl.
  runUrl: string | null;
  runIntegrity: string | null;
  runModules: { name: string; url: string; integrity: string; type: string }[] | null;
  overrides: OverridesPerAxis | null;
}

export interface BootstrapResponse {
  widget: BootstrapWidgetBlock | null;
  game: BootstrapGameBlock | null;
  /** Phase 11 game gate. `true` when the site key is gated: the server PICKED
   *  `gameId` from the per-site pool and signed `ticket` (the widget echoes it
   *  to /verify/start, which sets the session's game from it). `false` (or
   *  absent) ⇒ ungated; gameId / ticket omitted. */
  requiresGame?: boolean;
  gameId?: string;
  ticket?: string;
}
