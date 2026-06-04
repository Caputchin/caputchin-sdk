// Marketplace bundle URL + integrity hash for a game id. Hits the
// /v1/widget/bootstrap endpoint (which replaced the dedicated
// /api/v1/games/resolve endpoint). The same response shape powers the
// widget's white-label override fetch at mount time; for marketplace lookups
// specifically we only consume `game.url` + `game.integrity`.

export interface ResolvedGame {
  url: string;
  integrity: string;
}

export type ResolutionResult =
  | { ok: true; url: string; integrity: string }
  | { ok: false; code: 'resolve-failed'; message: string };

interface BootstrapGameBlock {
  url: string | null;
  integrity: string | null;
}

export async function fetchMarketplaceResolution(
  id: string,
  apiHost: string,
  sitekey: string | null,
): Promise<ResolutionResult> {
  // Game-bundle resolution is keyless: /v1/widget/bootstrap resolves the
  // marketplace `game` bundle (url + integrity) for any caller. The sitekey is
  // sent only when present, so a keyed call additionally carries the tenant's
  // overrides (unused here, consumed at mount); a game-only widget with no
  // sitekey still resolves the bundle.
  const params = new URLSearchParams({ game: id });
  if (sitekey) params.set('sitekey', sitekey);
  const url = `${apiHost}/v1/widget/bootstrap?${params.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return {
        ok: false,
        code: 'resolve-failed',
        message: `Widget bootstrap returned ${res.status} for game "${id}"`,
      };
    }
    const raw = (await res.json()) as { game?: BootstrapGameBlock | null };
    const game = raw.game ?? null;
    if (!game || typeof game.url !== 'string' || typeof game.integrity !== 'string') {
      // Not a marketplace game (no url) or wrapper-only collection row;
      // surface the same resolve-failed shape so the caller can fire a
      // game-load-failed event with a useful message.
      return {
        ok: false,
        code: 'resolve-failed',
        message: `Widget bootstrap returned no marketplace bundle for game "${id}"`,
      };
    }
    return { ok: true, url: game.url, integrity: game.integrity };
  } catch (err) {
    return {
      ok: false,
      code: 'resolve-failed',
      message: `Network error resolving game "${id}": ${String(err)}`,
    };
  }
}
