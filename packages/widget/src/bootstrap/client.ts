// Client for /api/v1/widget/bootstrap per ADR-0059. The widget calls this
// once at connectedCallback to fetch customer override preset banks (gated
// per plan tier) and marketplace game URL + integrity (when in game mode).
// First paint blocks on this call up to a 2 second hard timeout; on
// timeout, network error, or malformed response the widget falls back to
// bundled-only rendering.

import type { BootstrapResponse } from './types.js';

export interface FetchBootstrapInput {
  apiHost: string;
  sitekey: string;
  game?: string | null;
  langIso?: string | null;
  langPreset?: string | null;
  skinMode?: string | null;
  skinPreset?: string | null;
  configPreset?: string | null;
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
    // invalid JSON, anything else — uniform null result. The widget reads
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
  if (input.langIso) params.set('lang_iso', input.langIso);
  if (input.langPreset) params.set('lang_preset', input.langPreset);
  if (input.skinMode) params.set('skin_mode', input.skinMode);
  if (input.skinPreset) params.set('skin_preset', input.skinPreset);
  if (input.configPreset) params.set('config_preset', input.configPreset);
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
  };
}
