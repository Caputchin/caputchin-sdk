// Marketplace bundle URL + integrity hash for a game id. Hits the
// /api/v1/widget/bootstrap endpoint per ADR-0059 (which replaced the
// dedicated /api/v1/games/resolve endpoint from ADR-0058). The same
// response shape powers the widget's white-label override fetch at mount
// time; for marketplace lookups specifically we only consume `game.url` +
// `game.integrity`.

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
  if (!sitekey) {
    // Bootstrap (/api/v1/widget/bootstrap) requires a sitekey because the
    // response is cached per-tenant and gated per plan tier. Marketplace
    // lookups now share that endpoint, so the game-only-no-sitekey path
    // can no longer resolve marketplace ids. Customer must provision a
    // sitekey (free under Solo) to embed marketplace games.
    return {
      ok: false,
      code: 'resolve-failed',
      message: `Marketplace lookup for "${id}" requires a sitekey on <caputchin-game>; configure one and retry`,
    };
  }
  const params = new URLSearchParams({ sitekey, game: id });
  const url = `${apiHost}/api/v1/widget/bootstrap?${params.toString()}`;
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
