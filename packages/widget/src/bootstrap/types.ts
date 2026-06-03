// Wire types for /api/v1/widget/bootstrap. Kept local to the widget so this
// package does not depend on apps/web. The server-side equivalents live in
// @caputchin/api-schemas (runtime/schemas.ts) and the two shapes must stay
// byte-compatible - drift breaks resolution silently.
//
// The SERVER resolves one preset per axis (shell + game) and returns the
// RESOLVED presets; the widget applies them. There is no client-side
// resolution and no override preset banks on the wire.

import type { Layout, ResolvedConfig, ResolvedLocale, ResolvedSkin } from '@caputchin/game-sdk';

/** Why a bootstrap fetch fell back to bundled defaults. Carried on the
 *  customer-facing `degraded` event's `detail.reason` so telemetry can tell a
 *  slow / unreachable resolve apart from a malformed response.
 *  - `timeout`   - the resolve exceeded its time budget (service slow / hung).
 *  - `network`   - the fetch itself failed (offline, DNS, CORS, connection reset).
 *  - `http`      - a non-2xx, non-authoritative response (5xx, unexpected 4xx).
 *  - `malformed` - a 2xx whose body was not valid JSON / not the expected shape. */
export type DegradeReason = 'timeout' | 'network' | 'http' | 'malformed';

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
  // The game's preferred presentation (footprint + layout) from its manifest.
  // Replaces the deleted game->widget ManifestMessage that used to carry it.
  // `layout` is the game's preferred shell; the widget honors it only when the
  // embed leaves `layout` unset (default `auto`).
  preferred: { width?: number | 'full'; height?: number | 'full'; layout?: Layout } | null;
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
