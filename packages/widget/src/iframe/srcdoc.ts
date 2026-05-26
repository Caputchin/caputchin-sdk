import { canonicalizeGameUrl, validateGameUrl } from '../config/shared.js';

const INTEGRITY_RE = /^sha384-[A-Za-z0-9+/=]{60,100}$/;

// Customer-configured asset origins are re-validated here (defense in
// depth alongside the collector) before interpolation into the CSP. Only
// a bare scheme+host+port token is allowed, so a value can never carry the
// whitespace / ';' / ',' that would inject extra directives.
const ASSET_ORIGIN_RE = /^https?:\/\/[a-z0-9.-]+(?::\d{1,5})?$/i;

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface SrcdocOptions {
  gameId: string | null;
  gameUrl: string | null;
  integrity?: string | null;
  runtimeJs: string;
  runtimeSha256: string;
  // Customer-configured skin asset origins to allow in the frame's img-src /
  // media-src so a customer's own-CDN asset renders inside the sandbox. Empty
  // / omitted keeps the data:-only default.
  assetOrigins?: string[];
}

export function buildSrcdoc(opts: SrcdocOptions): string {
  const { gameId, gameUrl, integrity, runtimeJs, runtimeSha256, assetOrigins } = opts;

  const safeRuntimeSha256 = escapeAttr(runtimeSha256);

  let scriptSrc = `'sha256-${safeRuntimeSha256}'`;
  let gameScriptTag = '';

  if (gameUrl) {
    const urlErr = validateGameUrl(gameUrl);
    if (urlErr) {
      throw new Error(`buildSrcdoc: invalid gameUrl; ${urlErr}`);
    }
    // Same-origin paths need to be resolved to absolute URLs so they're valid
    // CSP source-list entries (paths alone are not valid CSP sources).
    const resolvedUrl = canonicalizeGameUrl(gameUrl);
    const safeGameUrl = escapeAttr(resolvedUrl);
    scriptSrc += ` ${safeGameUrl}`;

    const integrityAttr =
      integrity && INTEGRITY_RE.test(integrity)
        ? ` integrity="${escapeAttr(integrity)}" crossorigin="anonymous"`
        : '';

    gameScriptTag = `<script src="${safeGameUrl}"${integrityAttr}></script>`;
  }

  const safeGameId = gameId !== null ? escapeAttr(gameId) : '';

  // Passive-media origins only. script-src / connect-src stay untouched so
  // the untrusted game bundle keeps its containment floor regardless of
  // which asset hosts the customer configured.
  const safeAssetSrc = (assetOrigins ?? [])
    .filter((o) => ASSET_ORIGIN_RE.test(o))
    .map((o) => ` ${o}`)
    .join('');

  // Reset html/body margin+padding so the game's root sits flush with the
  // iframe edges. Default user-agent body margin (8px on most browsers)
  // would otherwise be visible as whitespace and inflate the auto-measured
  // scrollWidth/Height by 16px, defeating the game's preferredWidth/Height
  // sizing contract.
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${scriptSrc}; connect-src 'none'; img-src data:${safeAssetSrc}; media-src data:${safeAssetSrc}; font-src data:; style-src 'unsafe-inline'"><style>html,body{margin:0;padding:0}</style></head><body><div id="cpt-root"></div><script data-game-id="${safeGameId}">${runtimeJs}</script>${gameScriptTag}</body></html>`;
}
