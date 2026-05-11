import { validateGameUrl } from '../config.js';

const INTEGRITY_RE = /^sha384-[A-Za-z0-9+/=]{60,100}$/;

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface SrcdocOptions {
  gameId: string | null;
  gameUrl: string | null;
  integrity?: string | null;
  runtimeJs: string;
  runtimeSha256: string;
}

export function buildSrcdoc(opts: SrcdocOptions): string {
  const { gameId, gameUrl, integrity, runtimeJs, runtimeSha256 } = opts;

  const safeRuntimeSha256 = escapeAttr(runtimeSha256);

  let scriptSrc = `'sha256-${safeRuntimeSha256}'`;
  let gameScriptTag = '';

  if (gameUrl) {
    const urlErr = validateGameUrl(gameUrl);
    if (urlErr) {
      throw new Error(`buildSrcdoc: invalid gameUrl — ${urlErr}`);
    }
    const safeGameUrl = escapeAttr(gameUrl);
    scriptSrc += ` ${safeGameUrl}`;

    const integrityAttr =
      integrity && INTEGRITY_RE.test(integrity)
        ? ` integrity="${escapeAttr(integrity)}" crossorigin="anonymous"`
        : '';

    gameScriptTag = `<script src="${safeGameUrl}"${integrityAttr}></script>`;
  }

  const safeGameId = gameId !== null ? escapeAttr(gameId) : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${scriptSrc}; connect-src 'none'; img-src data:; media-src data:; font-src data:; style-src 'unsafe-inline'"></head><body><div id="cpt-root"></div><script data-game-id="${safeGameId}">${runtimeJs}</script>${gameScriptTag}</body></html>`;
}
