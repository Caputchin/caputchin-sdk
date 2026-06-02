// Client for /api/v1/widget/bootstrap. The widget calls this once at
// connectedCallback with the PRE-RESOLVED `locale` + `skin` (the element auto-
// detected them from the browser before this call when the attributes were
// missing, so the server always sees concrete values rather than `auto`); the
// server resolves one preset per axis (shell + game) and returns the resolved
// presets + the game URL/integrity.
//
// Two callers with opposite timeout policies:
//   - OPTIONAL (an in-page `game-src` bundle exists): first paint blocks on
//     this call up to a 2 second hard timeout; on timeout / network error /
//     malformed response it degrades to bundled-only rendering. The overrides
//     are best-effort there because the bundle can paint without them.
//   - MANDATORY (a bootstrap-sourced game: a marketplace id / gated key with
//     no `game-src`): the bootstrap is the SOLE source of the resolved presets
//     (skin/locale/config + footprint) AND the bundle, so it must NOT be
//     aborted - a slow bootstrap has to slow-load, never drop to an unstyled /
//     blank render. That caller uses `fetchBootstrapResilient` (no per-attempt
//     abort + a bounded retry on transient failure).

import type { BootstrapResponse } from './types.js';

export interface FetchBootstrapInput {
  apiHost: string;
  // Null = a KEYLESS bootstrap (no verification): the server resolves the game
  // by id off the live marketplace index (preferred footprint + presets) with
  // no tenant/overrides. Used by the game-only mount so a keyless preview still
  // gets its size + resolved axes.
  sitekey: string | null;
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
  /** Per-request abort window. `undefined` → the 2s default. A positive number
   *  → that window. `null` → NO abort signal (the request runs to completion);
   *  used by the mandatory bootstrap so a slow resolve slow-loads instead of
   *  degrading. */
  timeoutMs?: number | null;
}

export const BOOTSTRAP_DEFAULT_TIMEOUT_MS = 2000;

/** Mandatory-bootstrap retry policy. A bootstrap-sourced game has no in-page
 *  fallback, so a transient `degrade` (5xx / network / malformed) must be
 *  retried rather than rendered unstyled. Bounded so a genuinely-down server
 *  doesn't loop forever; on exhaustion the caller's existing degrade path
 *  (run-time marketplace resolve) still recovers the bundle, just unstyled. */
export const BOOTSTRAP_MANDATORY_ATTEMPTS = 3;
export const BOOTSTRAP_MANDATORY_BACKOFF_MS = 400;

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
  // `undefined` → default 2s; an explicit `null` → no abort window at all.
  const timeoutMs = input.timeoutMs === undefined ? BOOTSTRAP_DEFAULT_TIMEOUT_MS : input.timeoutMs;
  const url = buildBootstrapUrl(input);
  const { signal, cancel } = buildTimeoutSignal(timeoutMs);
  try {
    // Omit `signal` entirely when null so the request runs to completion (the
    // mandatory path). A merely-slow bootstrap then resolves `ok` rather than
    // aborting into a degrade.
    const res = await fetch(url, signal ? { signal } : {});
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
// unhandled-rejection noise in long-lived test suites). `ms === null` →
// no signal at all (the request is never aborted).
function buildTimeoutSignal(ms: number | null): { signal: AbortSignal | null; cancel: () => void } {
  if (ms === null) return { signal: null, cancel: () => {} };
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return { signal: AbortSignal.timeout(ms), cancel: () => {} };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(timer) };
}

/** The mandatory-bootstrap fetch: no per-attempt abort (a slow resolve
 *  slow-loads to completion) plus a bounded retry on transient `degrade`
 *  (5xx / network / malformed). An authoritative `gate` (409) and a successful
 *  `ok` are terminal - returned on the first occurrence, never retried. After
 *  the attempt budget is spent it returns the last `degrade` so the caller's
 *  existing fallback (run-time marketplace resolve) still recovers the bundle.
 *
 *  `attempts` / `backoffMs` are injectable for tests; `delayFn` defaults to a
 *  real `setTimeout` and is stubbed to a no-op in unit tests so retries don't
 *  add wall-clock. */
export async function fetchBootstrapResilient(
  input: FetchBootstrapInput,
  opts: { attempts?: number; backoffMs?: number; delayFn?: (ms: number) => Promise<void> } = {},
): Promise<BootstrapResult> {
  const attempts = Math.max(1, opts.attempts ?? BOOTSTRAP_MANDATORY_ATTEMPTS);
  const backoffMs = opts.backoffMs ?? BOOTSTRAP_MANDATORY_BACKOFF_MS;
  const delayFn = opts.delayFn ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let last: BootstrapResult = { kind: 'degrade' };
  for (let attempt = 0; attempt < attempts; attempt++) {
    // `timeoutMs: null` → the request is never aborted; only a real transient
    // failure produces a degrade worth retrying.
    last = await fetchBootstrap({ ...input, timeoutMs: null });
    if (last.kind !== 'degrade') return last;
    if (attempt < attempts - 1 && backoffMs > 0) await delayFn(backoffMs * 2 ** attempt);
  }
  return last;
}

// Sentinel marking a base64url-encoded inline-JSON axis value (see
// encodeInlineAxis). The server strips this prefix and decodes the rest.
const INLINE_AXIS_PREFIX = 'b64.';

// Encode an inline-JSON axis override (skin / locale) so it survives the
// request path. An inline value can carry a '#' hex color (e.g.
// {"title":"#7E3A91"}), and some hosting request layers treat a '#' inside a
// query value as a URL fragment delimiter, dropping everything after it before
// the server reads the param (which silently discards the override). base64url
// carries no '#' (its alphabet is A-Za-z0-9-_), so we encode any inline-JSON
// value behind the sentinel and send that. Preset names and mode shortcuts
// (no leading '{' or '[') are sent verbatim, so existing requests are
// unchanged.
function encodeInlineAxis(value: string): string {
  const trimmed = value.trimStart();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  // btoa is latin1-only, so go through UTF-8 bytes first to keep multi-byte
  // content (locale strings) intact, then map to the URL-safe alphabet.
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const b64url = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${INLINE_AXIS_PREFIX}${b64url}`;
}

export function buildBootstrapUrl(input: FetchBootstrapInput): string {
  const params = new URLSearchParams();
  // Omit sitekey entirely when null: the server treats a sitekey-less request
  // as a keyless live-index resolution.
  if (input.sitekey) params.set('sitekey', input.sitekey);
  if (input.game) params.set('game', input.game);
  if (input.games) params.set('games', input.games);
  // skin / locale may be inline JSON; encode so a '#' hex color is not lost in
  // transit (see encodeInlineAxis). game / games / sitekey are plain ids.
  if (input.locale) params.set('locale', encodeInlineAxis(input.locale));
  if (input.skin) params.set('skin', encodeInlineAxis(input.skin));
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
