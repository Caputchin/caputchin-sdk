export type Layout = 'inline' | 'modal' | 'fullscreen';

export interface Bridge {
  pass(result: { score: number; durationMs?: number }): void;
  error(err: { code: string; message?: string }): void;
  /** Tell the widget to resize the iframe to fit the game's content. Use
   *  this when your game can compute its viewport but doesn't use an
   *  intrinsic-sized root element (e.g. CSS-percentage layouts that auto-
   *  measure can't infer). The widget also auto-measures the game's first
   *  child after factory runs; this is the explicit escape hatch.
   *
   *  Call AFTER your first paint. Calling repeatedly mid-session works but
   *  is discouraged — viewport changes during play are an antipattern. */
  setSize(width: number, height: number): void;
  readonly layout: Layout | null;
}

export type GameFactory = (
  container: HTMLElement,
  bridge: Bridge,
) => (() => void) | void;

export interface RegisterOptions {
  preferredLayout?: Layout;
  /** Preferred iframe width in CSS pixels. The widget honors it unless the
   * customer overrides via the `width` attribute or CSS. */
  preferredWidth?: number;
  /** Preferred iframe height in CSS pixels. Same precedence as preferredWidth. */
  preferredHeight?: number;
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
