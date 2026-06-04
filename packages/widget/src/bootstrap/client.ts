// Client for /v1/widget/bootstrap. The widget calls this once at
// connectedCallback with the PRE-RESOLVED `locale` + `skin` (the element auto-
// detected them from the browser before this call when the attributes were
// missing, so the server always sees concrete values rather than `auto`); the
// server resolves one preset per axis (shell + game) and returns the resolved
// presets + the game URL/integrity.
//
// Resilience policy (`fetchBootstrapResilient`, the `<caputchin-game>` caller):
// the bootstrap carries the game's preferred footprint + resolved skin/locale,
// so a SILENT degrade mis-sizes the game and drops to bundled skin. The old
// behaviour aborted at a hard 2s and degraded silently, which on a slow service
// rendered an unstyled, wrongly-sized game. Now each attempt gets a GENEROUS
// per-attempt ceiling (tolerate a slow-but-alive server instead of aborting it)
// with a bounded retry on FAST transient failure (network reset / 5xx /
// malformed). A per-attempt TIMEOUT is terminal - the ceiling already gave the
// server a full window, and retrying a slow server only multiplies the wait -
// so the worst-case spinner is one ceiling, never unbounded. On final exhaustion
// the caller degrades to bundled AND fires the `degraded` event (never silent).
//
// `fetchBootstrap` is the single-attempt primitive (still used by the cap-only
// `<caputchin-widget>`, whose bundled checkbox is fully usable so a shorter
// window is the right trade). Both accept an external `signal` (the element's
// disconnect AbortController) so a torn-down widget stops fetching/retrying.

import type { BootstrapResponse, DegradeReason } from './types.js';

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
  /** Per-request abort window. `undefined` → the default. A positive number
   *  → that window. `null` → NO timeout signal (the request runs until it
   *  resolves or the external `signal` aborts). */
  timeoutMs?: number | null;
  /** External abort signal, merged with the per-request timeout. The elements
   *  pass their disconnect AbortController here so a removed widget stops
   *  fetching (and the resilient loop stops retrying). */
  signal?: AbortSignal;
}

/** Single-attempt default window (`fetchBootstrap`). Kept short: its only
 *  caller is the cap-only widget, whose bundled checkbox paints fine without
 *  the resolve, so a long blocking wait would be the worse trade. */
export const BOOTSTRAP_DEFAULT_TIMEOUT_MS = 2000;

/** Resilient per-attempt ceiling (`fetchBootstrapResilient`). Generous on
 *  purpose: it must tolerate a slow-but-alive server (the bug it replaces
 *  aborted those at 2s and mis-rendered), while still bounding a HUNG
 *  connection so the loading skeleton can't spin forever. */
export const BOOTSTRAP_ATTEMPT_TIMEOUT_MS = 8000;

/** Resilient retry policy. A `degrade` from a FAST transient failure (5xx /
 *  network / malformed) is retried; a per-attempt `timeout` is terminal (the
 *  ceiling already gave the server a full window). Bounded so a genuinely-down
 *  server doesn't loop forever; on exhaustion the caller degrades to bundled
 *  and fires the `degraded` event. */
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
 *                bundled-only rendering and fire the `degraded` event. The
 *                `reason` distinguishes a slow/hung server (`timeout`, terminal
 *                for the resilient retry) from a fast failure worth retrying. */
export type BootstrapResult =
  | { kind: 'ok'; response: BootstrapResponse }
  | { kind: 'gate'; error: BootstrapGateError }
  | { kind: 'degrade'; reason: DegradeReason };

export async function fetchBootstrap(input: FetchBootstrapInput): Promise<BootstrapResult> {
  // `undefined` → default window; an explicit `null` → no timeout (runs until
  // it resolves or the external signal aborts).
  const timeoutMs = input.timeoutMs === undefined ? BOOTSTRAP_DEFAULT_TIMEOUT_MS : input.timeoutMs;
  const url = buildBootstrapUrl(input);
  const { signal, cancel } = buildTimeoutSignal(timeoutMs, input.signal);
  try {
    // Omit `signal` entirely only when there's nothing to abort on (no timeout
    // AND no external signal). A merely-slow bootstrap then resolves `ok`.
    const res = await fetch(url, signal ? { signal } : {});
    if (res.ok) {
      let raw: unknown;
      try {
        raw = await res.json();
      } catch {
        // 2xx with an unparseable body: bundled fallback, tagged malformed.
        return { kind: 'degrade', reason: 'malformed' };
      }
      const response = validateBootstrapResponse(raw);
      // Malformed-but-200 stays a degrade (bundled fallback), as before.
      return response ? { kind: 'ok', response } : { kind: 'degrade', reason: 'malformed' };
    }
    // Authoritative gate rejection: a 409 carrying a known gate code. The
    // server says this key+game can't make a valid round, so degrading into a
    // bundled mount would just dead-end at /verify/start (no ticket). Surface
    // it instead. Any OTHER non-2xx (5xx, unexpected 4xx) is transient.
    if (res.status === 409) {
      const gate = await parseGateError(res);
      if (gate) return { kind: 'gate', error: gate };
    }
    return { kind: 'degrade', reason: 'http' };
  } catch (err) {
    // AbortError on timeout / external abort → `timeout` (terminal for the
    // resilient retry); any other throw (TypeError network failure, etc.) →
    // `network`. The widget reads degrade as "no overrides, mount with bundled".
    const aborted = (err as { name?: string } | null)?.name === 'AbortError';
    return { kind: 'degrade', reason: aborted ? 'timeout' : 'network' };
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

// Build the fetch abort signal from a per-request timeout merged with the
// caller's external (disconnect) signal. A single AbortController fans both in
// rather than AbortSignal.timeout / AbortSignal.any (happy-dom strips both, and
// we need the merge regardless). The returned `cancel` clears the timer and
// detaches the external listener so the abort never fires after the response
// settles (avoiding bogus unhandled-rejection noise in long-lived suites).
//   - `ms === null` AND no external → no signal at all (never aborted).
//   - external already aborted → the controller starts aborted (fetch rejects
//     immediately with AbortError).
function buildTimeoutSignal(
  ms: number | null,
  external?: AbortSignal,
): { signal: AbortSignal | null; cancel: () => void } {
  if (ms === null && !external) return { signal: null, cancel: () => {} };
  const ctrl = new AbortController();
  const cleanups: Array<() => void> = [];
  if (external) {
    if (external.aborted) ctrl.abort();
    else {
      const onAbort = (): void => ctrl.abort();
      external.addEventListener('abort', onAbort, { once: true });
      cleanups.push(() => external.removeEventListener('abort', onAbort));
    }
  }
  // Skip arming the timer when the external signal already aborted the
  // controller - there's nothing left to time out.
  if (ms !== null && !ctrl.signal.aborted) {
    const timer = setTimeout(() => ctrl.abort(), ms);
    cleanups.push(() => clearTimeout(timer));
  }
  return { signal: ctrl.signal, cancel: () => { for (const c of cleanups) c(); } };
}

/** The resilient bootstrap fetch (the `<caputchin-game>` caller): a GENEROUS
 *  per-attempt ceiling (tolerate a slow-but-alive server) plus a bounded retry
 *  on FAST transient `degrade` (5xx / network / malformed). Terminal outcomes,
 *  returned on first occurrence and never retried:
 *    - `ok` / `gate` (409)        - authoritative.
 *    - `degrade` reason `timeout` - the ceiling already gave the server a full
 *      window; retrying a slow/hung server only multiplies the wait, so we stop
 *      here. This is what bounds the worst-case loading spinner to one ceiling.
 *  After the attempt budget is spent it returns the last `degrade` so the
 *  caller degrades to bundled (and fires the `degraded` event). The external
 *  `signal` (disconnect) short-circuits the loop between attempts.
 *
 *  `attempts` / `backoffMs` / `attemptTimeoutMs` are injectable for tests;
 *  `delayFn` defaults to a real `setTimeout` and is stubbed in unit tests so
 *  retries don't add wall-clock. */
export async function fetchBootstrapResilient(
  input: FetchBootstrapInput,
  opts: {
    attempts?: number;
    backoffMs?: number;
    attemptTimeoutMs?: number | null;
    delayFn?: (ms: number) => Promise<void>;
  } = {},
): Promise<BootstrapResult> {
  const attempts = Math.max(1, opts.attempts ?? BOOTSTRAP_MANDATORY_ATTEMPTS);
  const backoffMs = opts.backoffMs ?? BOOTSTRAP_MANDATORY_BACKOFF_MS;
  const attemptTimeoutMs =
    opts.attemptTimeoutMs === undefined ? BOOTSTRAP_ATTEMPT_TIMEOUT_MS : opts.attemptTimeoutMs;
  const baseDelay = opts.delayFn ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  // Backoff that resolves early when the external signal aborts, so a disconnect
  // mid-sleep stops the loop immediately instead of waiting out the window.
  const delay = (ms: number): Promise<void> => new Promise<void>((resolve) => {
    const sig = input.signal;
    if (sig?.aborted) { resolve(); return; }
    let settled = false;
    const done = (): void => {
      if (settled) return;
      settled = true;
      sig?.removeEventListener('abort', done);
      resolve();
    };
    sig?.addEventListener('abort', done, { once: true });
    void baseDelay(ms).then(done);
  });
  let last: BootstrapResult = { kind: 'degrade', reason: 'network' };
  for (let attempt = 0; attempt < attempts; attempt++) {
    // The widget was removed mid-loop: stop, the caller's mount is guarded off.
    if (input.signal?.aborted) return last;
    last = await fetchBootstrap({ ...input, timeoutMs: attemptTimeoutMs });
    // `ok` / `gate` are authoritative; a `timeout` degrade is terminal (see above).
    if (last.kind !== 'degrade' || last.reason === 'timeout') return last;
    if (input.signal?.aborted) return last;
    if (attempt < attempts - 1 && backoffMs > 0) await delay(backoffMs * 2 ** attempt);
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
  return `${input.apiHost}/v1/widget/bootstrap?${params.toString()}`;
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
