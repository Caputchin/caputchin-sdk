export type GameFactory = (
  container: HTMLElement,
  onComplete: (result: { score: number }) => void,
) => (() => void) | void;

export function register(id: string, factory: GameFactory): void {
  const caputchin = (globalThis as Record<string, unknown>)['Caputchin'] as
    | { games?: Record<string, GameFactory> }
    | undefined;

  if (!caputchin) {
    console.warn('[caputchin/game-sdk] Caputchin global not found — ensure @caputchin/widget is loaded first');
    return;
  }

  if (!caputchin.games) {
    caputchin.games = {};
  }

  if (Object.prototype.hasOwnProperty.call(caputchin.games, id)) {
    console.warn(`[caputchin/game-sdk] duplicate game id "${id}" — overwriting`);
  }

  caputchin.games[id] = factory;
}
