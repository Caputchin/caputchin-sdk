import type { OverridesPerAxis } from './types.js';

// A CSP source-list token is whitespace-delimited, so an origin smuggled
// into the policy could only inject extra directives if it carried a
// space, ';' or ','. Restrict accepted origins to scheme + host + optional
// port with no path/query/fragment (exactly the shape `URL.origin` produces
// for an http(s) URL), and re-test here so a malformed value can never widen
// the policy beyond a single bare origin.
const ASSET_ORIGIN_RE = /^https?:\/\/[a-z0-9.-]+(?::\d{1,5})?$/i;

/**
 * Collect the distinct http(s) origins the customer referenced from their
 * dashboard-authored **skin** override bank (ADR-0059). Assets are a
 * skin-axis concept only (`resolveAssetUrl` runs solely in the skin
 * resolver), so locale/configuration banks are not scanned.
 *
 * These origins are injected into the game iframe's srcdoc CSP `img-src` /
 * `media-src` so a customer-configured asset hosted on their own CDN loads
 * inside the sandboxed game frame, while the containment floor for the
 * untrusted game bundle stays intact: `script-src` / `connect-src` are
 * unchanged, so the game still cannot fetch or execute against these
 * origins, only render passive media the customer chose.
 *
 * Non-URL values (colors, `data:` URIs, bundle-relative paths) are skipped.
 * `data:` is already permitted by the directive, and bundle assets resolve
 * against the game origin which the author owns.
 */
export function collectSkinAssetOrigins(overrides: OverridesPerAxis | null): string[] {
  const presets = overrides?.skin?.presets;
  if (!presets) return [];
  const origins = new Set<string>();
  for (const preset of Object.values(presets)) {
    for (const value of Object.values(preset)) {
      if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) continue;
      let origin: string;
      try {
        origin = new URL(value).origin;
      } catch {
        continue;
      }
      if (ASSET_ORIGIN_RE.test(origin)) origins.add(origin);
    }
  }
  return [...origins];
}
