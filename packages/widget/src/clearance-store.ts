/**
 * Storage for the reuse clearance token - the ONLY place any client-side
 * storage exists in this widget. Reuse is off by default; the server opts a
 * site in and, after a fresh solve, may grant a clearance. That clearance
 * comes back here so the next mount can present it and skip the game
 * entirely (see cap-session.ts + cap/custom-fetch.ts).
 *
 * `persist` (server-controlled, per site) decides where a granted clearance
 * lands:
 *   - true  -> a first-party cookie; survives a reload or a new tab, bounded
 *              by the server's reuse window.
 *   - false -> a module-scope variable; survives a remount (e.g. a React
 *              effect re-run) but not a reload - gone once the page unloads.
 *
 * Reads check the cookie first, then memory, so a persisted grant always
 * wins over an earlier non-persisted one.
 */

const COOKIE_NAME = '__cptr';
// Fallback TTL when the server didn't send a usable reuseWindowMs. Matches
// the server's own default clamp; kept here only as a defensive floor.
const DEFAULT_MAX_AGE_S = 600;

let memoryClearance: string | null = null;

function readCookie(): string | null {
  if (typeof document === 'undefined') return null;
  for (const part of document.cookie.split('; ')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq) !== COOKIE_NAME) continue;
    // An expired/cleared cookie can linger as a present-but-empty pair
    // (name= with no value) rather than disappearing outright; treat that
    // the same as absent instead of returning a useless empty clearance.
    const value = decodeURIComponent(part.slice(eq + 1));
    return value || null;
  }
  return null;
}

// The clearance is a bearer credential - Secure keeps it off a plaintext
// wire. Conditional on the origin actually being secure so http localhost
// (dev, the harness) still works; `isSecureContext` also covers `localhost`
// itself, which browsers treat as secure even over plain http.
function isSecureOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'https:' || window.isSecureContext === true;
}

function writeCookie(clearance: string, reuseWindowMs: number | undefined): void {
  if (typeof document === 'undefined') return;
  const maxAgeS = typeof reuseWindowMs === 'number' && reuseWindowMs > 0
    ? Math.round(reuseWindowMs / 1000)
    : DEFAULT_MAX_AGE_S;
  const secure = isSecureOrigin() ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(clearance)}; SameSite=Strict; Path=/; Max-Age=${maxAgeS}${secure}`;
}

/** Read the stored clearance (cookie first, then in-memory). Null when
 *  neither is set - reuse off, a lapsed clearance, or a fresh browser. */
export function readClearance(): string | null {
  return readCookie() ?? memoryClearance;
}

/** Store a fresh clearance from a `/verify/pass` response. `persist` writes
 *  a first-party cookie (TTL from `reuseWindowMs`, falling back to 10
 *  minutes when absent/invalid); otherwise the clearance lives in memory
 *  only, for the rest of this page's lifetime. */
export function writeClearance(clearance: string, persist: boolean, reuseWindowMs: number | undefined): void {
  if (persist) {
    writeCookie(clearance, reuseWindowMs);
  } else {
    memoryClearance = clearance;
  }
}
