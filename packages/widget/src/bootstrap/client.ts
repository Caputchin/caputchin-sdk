// Client for /api/v1/widget/bootstrap. The widget calls this once at
// connectedCallback with the PRE-RESOLVED `locale` + `skin` (the element auto-
// detected them from the browser before this call when the attributes were
// missing, so the server always sees concrete values rather than `auto`); the
// server resolves one preset per axis (shell + game) and returns the resolved
// presets + the game URL/integrity. First paint blocks on this call up to a 2
// second hard timeout; on timeout, network error, or malformed response the
// widget falls back to bundled-only rendering.

import type { BootstrapResponse } from './types.js';

export interface FetchBootstrapInput {
  apiHost: string;
  sitekey: string;
  game?: string | null;
  /** Client sub-pool hint for a gated key (comma-joined game ids). The server
   *  picks one from `games ∩ pool`; ignored on an ungated key. */
  games?: string | null;
  /** Resolution inputs. The element auto-detects these from the browser
   *  (navigator language for locale, prefers-color-scheme for skin) when the
   *  corresponding attribute is missing / `auto`, so by the time they reach
   *  here they are concrete preset names / language tags / `light|dark` /
   *  inline JSON. Null means the element could not determine a value (no
   *  navigator); the server falls back to the bundled defaults. */
  locale?: string | null;
  skin?: string | null;
  timeoutMs?: number;
}

export const BOOTSTRAP_DEFAULT_TIMEOUT_MS = 2000;

export async function fetchBootstrap(input: FetchBootstrapInput): Promise<BootstrapResponse | null> {
  const timeoutMs = input.timeoutMs ?? BOOTSTRAP_DEFAULT_TIMEOUT_MS;
  const url = buildBootstrapUrl(input);
  const { signal, cancel } = buildTimeoutSignal(timeoutMs);
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const raw: unknown = await res.json();
    return validateBootstrapResponse(raw);
  } catch {
    // AbortError on timeout, TypeError on network failure, SyntaxError on
    // invalid JSON, anything else - uniform null result. The widget reads
    // null as "no overrides, mount with bundled".
    return null;
  } finally {
    cancel();
  }
}

// AbortSignal.timeout is the natural fit but is not available in every
// runtime we test against (happy-dom strips it). Fall back to
// AbortController + setTimeout; the returned `cancel` clears the timer so
// the abort never fires after a successful response (avoiding bogus
// unhandled-rejection noise in long-lived test suites).
function buildTimeoutSignal(ms: number): { signal: AbortSignal; cancel: () => void } {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return { signal: AbortSignal.timeout(ms), cancel: () => {} };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(timer) };
}

export function buildBootstrapUrl(input: FetchBootstrapInput): string {
  const params = new URLSearchParams();
  params.set('sitekey', input.sitekey);
  if (input.game) params.set('game', input.game);
  if (input.games) params.set('games', input.games);
  if (input.locale) params.set('locale', input.locale);
  if (input.skin) params.set('skin', input.skin);
  return `${input.apiHost}/api/v1/widget/bootstrap?${params.toString()}`;
}

// Top-level shape guard at the JSON-decode boundary. Per project memory:
// guard decode primitives at the closest call site. The two child blocks
// (widget, game) are nullable or absent, and deeper structure (overrides
// per axis) is trusted because the server-side schemas
// (api-schemas runtime/schemas.ts) enforce it. Returning null here makes
// the caller fall back to bundled.
export function validateBootstrapResponse(raw: unknown): BootstrapResponse | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const widget = obj['widget'];
  const game = obj['game'];
  // Each block must be one of: absent (undefined), null, or a plain object.
  // Any other type (string, number, array, etc.) is malformed → null result.
  if (widget !== null && widget !== undefined && (typeof widget !== 'object' || Array.isArray(widget))) {
    return null;
  }
  if (game !== null && game !== undefined && (typeof game !== 'object' || Array.isArray(game))) {
    return null;
  }
  return {
    widget: (widget as BootstrapResponse['widget']) ?? null,
    game: (game as BootstrapResponse['game']) ?? null,
    // Server gate fields. requiresGame coerced to a strict boolean; gameId /
    // ticket are opaque strings the widget echoes back (the server re-validates
    // the ticket signature), so a loose pass-through is safe here.
    requiresGame: obj['requiresGame'] === true,
    gameId: typeof obj['gameId'] === 'string' ? (obj['gameId'] as string) : undefined,
    ticket: typeof obj['ticket'] === 'string' ? (obj['ticket'] as string) : undefined,
  };
}
