export interface ResolvedGame {
  url: string;
  integrity: string;
}

export type ResolutionResult =
  | { ok: true; url: string; integrity: string }
  | { ok: false; code: 'resolve-failed'; message: string };

export async function fetchMarketplaceResolution(
  id: string,
  apiHost: string
): Promise<ResolutionResult> {
  const encodedId = encodeURIComponent(id);
  const url = `${apiHost}/api/v1/games/${encodedId}/resolve`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return {
        ok: false,
        code: 'resolve-failed',
        message: `Marketplace resolve returned ${res.status} for game "${id}"`,
      };
    }
    const data = (await res.json()) as ResolvedGame;
    return { ok: true, url: data.url, integrity: data.integrity };
  } catch (err) {
    return {
      ok: false,
      code: 'resolve-failed',
      message: `Network error resolving game "${id}": ${String(err)}`,
    };
  }
}
