export interface Bridge {
  pass(result: { score: number; durationMs?: number }): void;
  error(err: { code: string; message?: string }): void;
}

export type GameFactory = (
  container: HTMLElement,
  bridge: Bridge,
) => (() => void) | void;

type Caputchin = { games: Record<string, GameFactory> };

export function register(id: string, factory: GameFactory): void {
  const g = globalThis as Record<string, unknown>;

  if (!g['Caputchin']) {
    console.warn(
      '[caputchin/game-sdk] Caputchin global not found — was the SDK loaded outside a Caputchin iframe?',
    );
    g['Caputchin'] = { games: {} } satisfies Caputchin;
  }

  const caputchin = g['Caputchin'] as Caputchin;

  if (Object.prototype.hasOwnProperty.call(caputchin.games, id)) {
    console.warn(`[caputchin/game-sdk] duplicate game id "${id}" — last-write-wins`);
  }

  caputchin.games[id] = factory;
}
