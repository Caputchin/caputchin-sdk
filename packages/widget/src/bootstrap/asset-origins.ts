import type { ResolvedSkin } from '@caputchin/game-sdk';

// A CSP source-list token is whitespace-delimited, so an origin smuggled
// into the policy could only inject extra directives if it carried a
// space, ';' or ','. Restrict accepted origins to scheme + host + optional
// port with no path/query/fragment (exactly the shape `URL.origin` produces
// for an http(s) URL), and re-test here so a malformed value can never widen
// the policy beyond a single bare origin.
const ASSET_ORIGIN_RE = /^https?:\/\/[a-z0-9.-]+(?::\d{1,5})?$/i;

/**
 * Collect the distinct http(s) asset origins from the SERVER-RESOLVED skin (the
 * final skin the game receives via kickoff). Assets are a skin-axis concept
 * only. The server already resolved one skin preset with its absolute asset
 * URLs, so we scan the resolved values rather than any override banks.
 *
 * These origins are injected into the game iframe's srcdoc CSP `img-src` /
 * `media-src` so a customer-configured asset hosted on their own CDN loads
 * inside the sandboxed game frame, while the containment floor for the
 * untrusted game bundle stays intact: `script-src` / `connect-src` are
 * unchanged, so the game still cannot fetch or execute against these origins,
 * only render passive media the customer chose.
 *
 * Non-URL values (colors, `data:` URIs) are skipped: `data:` is already
 * permitted by the directive, and the resolver already joined bundle-relative
 * paths against the game origin the author owns.
 */
export function collectSkinAssetOrigins(skin: ResolvedSkin | null): string[] {
  if (!skin) return [];
  const origins = new Set<string>();
  for (const value of Object.values(skin)) {
    if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) continue;
    let origin: string;
    try {
      origin = new URL(value).origin;
    } catch {
      continue;
    }
    if (ASSET_ORIGIN_RE.test(origin)) origins.add(origin);
  }
  return [...origins];
}
