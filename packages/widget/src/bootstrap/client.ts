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

/** The server's authoritative gate codes (409). These mean the configuration
 *  can NEVER produce a valid round - distinct from a transient blip. */
const GATE_ERROR_CODES: ReadonlySet<string> = new Set([
  'gate-misconfigured',
  'gate-game-not-installed',
]);

/** An authoritative gate rejection from /widget/bootstrap (HTTP 409). */
export interface BootstrapGateError {
  /** Server error code (e.g. `gate-game-not-installed`). */
  code: string;
  /** Human-readable, DEV-facing reason from the server. May be empty. */
  message: string;
}

/** Three outcomes the widget must distinguish:
 *  - `ok`      - resolved presets + (gated) ticket; mount normally.
 *  - `gate`    - authoritative 409; surface an error, do NOT mount a round.
 *  - `degrade` - transient (timeout / network / 5xx / malformed); fall back to
 *                bundled-only rendering. The old "everything is null" behavior,
 *                now scoped to NON-authoritative failures. */
export type BootstrapResult =
  | { kind: 'ok'; response: BootstrapResponse }
  | { kind: 'gate'; error: BootstrapGateError }
  | { kind: 'degrade' };

export async function fetchBootstrap(input: FetchBootstrapInput): Promise<BootstrapResult> {
  const timeoutMs = input.timeoutMs ?? BOOTSTRAP_DEFAULT_TIMEOUT_MS;
  const url = buildBootstrapUrl(input);
  const { signal, cancel } = buildTimeoutSignal(timeoutMs);
  try {
    const res = await fetch(url, { signal });
    if (res.ok) {
      const raw: unknown = await res.json();
      const response = validateBootstrapResponse(raw);
      // Malformed-but-200 stays a degrade (bundled fallback), as before.
      return response ? { kind: 'ok', response } : { kind: 'degrade' };
    }
    // Authoritative gate rejection: a 409 carrying a known gate code. The
    // server says this key+game can't make a valid round, so degrading into a
    // bundled mount would just dead-end at /verify/start (no ticket). Surface
    // it instead. Any OTHER non-2xx (5xx, unexpected 4xx) is transient.
    if (res.status === 409) {
      const gate = await parseGateError(res);
      if (gate) return { kind: 'gate', error: gate };
    }
    return { kind: 'degrade' };
  } catch {
    // AbortError on timeout, TypeError on network failure, SyntaxError on
    // invalid JSON, anything else - uniform degrade. The widget reads degrade
    // as "no overrides, mount with bundled".
    return { kind: 'degrade' };
  } finally {
    cancel();
  }
}

/** Parse a 409 body into a gate error. Returns null when the body is missing /
 *  malformed or the code isn't an authoritative gate code (caller then treats
 *  the 409 as a transient degrade rather than a hard error). */
async function parseGateError(res: Response): Promise<BootstrapGateError | null> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null;
  }
  if (typeof body !== 'object' || body === null) return null;
  const obj = body as Record<string, unknown>;
  const code = obj['error'];
  if (typeof code !== 'string' || !GATE_ERROR_CODES.has(code)) return null;
  const message = typeof obj['message'] === 'string' ? (obj['message'] as string) : '';
  return { code, message };
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
