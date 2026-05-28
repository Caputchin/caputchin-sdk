// Wire types for /api/v1/widget/bootstrap. Kept local to the widget so this
// package does not depend on apps/web. The server-side equivalents live in
// @caputchin/api-schemas (runtime/schemas.ts) and the two shapes must stay
// byte-compatible - drift breaks resolution silently.
//
// The SERVER resolves one preset per axis (shell + game) and returns the
// RESOLVED presets; the widget applies them. There is no client-side
// resolution and no override preset banks on the wire.

import type { ResolvedConfig, ResolvedLocale, ResolvedSkin } from '@caputchin/game-sdk';

/** One resolved preset per axis. A null axis means the server resolved nothing
 *  (e.g. the game declares no presets for that axis) - the widget/game falls
 *  back to its bundled default for that axis. */
export interface ResolvedAxes {
  locale: ResolvedLocale | null;
  skin: ResolvedSkin | null;
  config: ResolvedConfig | null;
}

export interface BootstrapWidgetBlock {
  resolved: ResolvedAxes;
}

export interface BootstrapGameBlock {
  url: string | null;
  integrity: string | null;
  // Server-validated-replay artifact. Present for byte-compatibility with the
  // runtime schema; the widget loads `url` and never reads these.
  runUrl: string | null;
  runIntegrity: string | null;
  runModules: { name: string; url: string; integrity: string; type: string }[] | null;
  // The game's preferred presentation footprint (from its manifest). Replaces
  // the deleted game->widget ManifestMessage that used to carry it.
  preferred: { width?: number; height?: number } | null;
  resolved: ResolvedAxes;
}

export interface BootstrapResponse {
  widget: BootstrapWidgetBlock | null;
  game: BootstrapGameBlock | null;
  /** Server game gate. `true` when the site key is gated: the server PICKED
   *  `gameId` from the per-site pool and signed `ticket` (the widget echoes it
   *  to /verify/start, which sets the session's game from it). `false` (or
   *  absent) => ungated; gameId / ticket omitted. */
  requiresGame?: boolean;
  gameId?: string;
  ticket?: string;
}
