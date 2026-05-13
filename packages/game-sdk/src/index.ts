export type Layout = 'inline' | 'modal' | 'fullscreen';

export interface Bridge {
  pass(result: { score: number; durationMs?: number }): void;
  error(err: { code: string; message?: string }): void;
  readonly layout: Layout | null;
}

export type GameFactory = (
  container: HTMLElement,
  bridge: Bridge,
) => (() => void) | void;

export interface RegisterOptions {
  preferredLayout?: Layout;
}

type Caputchin = {
  games: Record<string, GameFactory>;
  gameOpts: Record<string, RegisterOptions>;
};

export function register(id: string, factory: GameFactory, opts?: RegisterOptions): void {
  const g = globalThis as Record<string, unknown>;

  if (!g['Caputchin']) {
    console.warn(
      '[caputchin/game-sdk] Caputchin global not found — was the SDK loaded outside a Caputchin iframe?',
    );
    g['Caputchin'] = { games: {}, gameOpts: {} } satisfies Caputchin;
  }

  const caputchin = g['Caputchin'] as Caputchin;
  if (!caputchin.gameOpts) caputchin.gameOpts = {};

  if (Object.prototype.hasOwnProperty.call(caputchin.games, id)) {
    console.warn(`[caputchin/game-sdk] duplicate game id "${id}" — last-write-wins`);
  }

  caputchin.games[id] = factory;
  if (opts) {
    caputchin.gameOpts[id] = opts;
  }
}
