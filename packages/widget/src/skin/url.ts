/** Asset URL resolver for skin presets. Three cases:
 *
 *   - `data:` URIs pass through verbatim (origin-free; mimetype check
 *     happens in the type validator).
 *   - Absolute URLs (`https://...`, `http://...`, protocol-relative `//...`)
 *     pass through verbatim. Customer's CDN choice wins.
 *   - Everything else is joined against `baseUrl` via the URL constructor.
 *     This mirrors how `script` paths in `caputchin.json` are resolved
 *     (game bundle base). Author guidance:
 *       * Bare relative paths (`assets/leaf.png`) resolve against the
 *         bundle directory →
 *         `https://unpkg.com/@caputchin/game-x@1.2.3/assets/leaf.png`.
 *       * Leading-slash paths (`/assets/leaf.png`) are *root-absolute* per
 *         the URL spec and drop the package path →
 *         `https://unpkg.com/assets/leaf.png`. Prefer the bare form unless
 *         you specifically want a CDN-root path.
 *
 *  When `baseUrl` is `null` (widget shell skins resolved before the
 *  bundle URL is known) bundle-relative paths pass through verbatim;
 *  the caller can still feed them to `<img src>` and the browser will
 *  resolve against the document's origin. */
export function resolveAssetUrl(value: string, baseUrl: string | null): string {
  if (value.startsWith('data:')) return value;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return value;
  if (!baseUrl) return value;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}
