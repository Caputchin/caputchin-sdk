export interface ResolverFixture {
  url: string;
  integrity: string;
}

export function installResolverStub(
  games: Record<string, ResolverFixture>,
  apiHost = 'https://api.caputchin.com'
): () => void {
  const original = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    const resolverBase = `${apiHost}/api/v1/games/`;

    if (urlStr.startsWith(resolverBase)) {
      const encodedId = urlStr.slice(resolverBase.length).split('/')[0]!;
      const id = decodeURIComponent(encodedId);
      const fixture = games[id];
      if (fixture) {
        return new Response(JSON.stringify(fixture), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
    }

    return original(input, init);
  };

  return () => { globalThis.fetch = original; };
}
