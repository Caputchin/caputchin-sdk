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
   *  is discouraged; viewport changes during play are an antipattern. */
  setSize(width: number, height: number): void;
  readonly layout: Layout | null;
}

/** One language preset declared in `caputchin.json` under `languages.presets`.
 *  Underscore-prefixed keys are metadata; every other key is a translatable
 *  text token. Direction can be omitted and is auto-derived from `_iso` when
 *  the language is in the RTL set (ar, he, fa, ur, yi, ps, sd). */
export interface LanguagePreset {
  _iso?: string;
  _direction?: 'ltr' | 'rtl';
  _default?: boolean;
  _extends?: string;
  [key: string]: string | boolean | undefined;
}

/** Final language object the widget hands the game. `_extends` and
 *  `_default` are stripped during resolution; only metadata (`_iso`,
 *  `_direction`) and text tokens survive. */
export interface ResolvedLanguage {
  _direction: 'ltr' | 'rtl';
  _iso: string;
  [key: string]: string;
}

/** Per-session context the widget passes to the game factory as a third arg.
 *  Open extension point: future axes (themes, configurations) land here as
 *  additional fields without changing the factory signature. */
export interface GameContext {
  lang: ResolvedLanguage | null;
}

/** The full package manifest the game ships in `caputchin.json`. Authors
 *  import this file and pass the parsed object to `register`. The widget
 *  reads runtime hints (preferred layout / size, language presets) directly
 *  off the manifest. */
export interface GameManifest {
  id: string;
  version: string;
  displayName?: string;
  description?: string;
  npm?: string;
  script?: string;
  support?: {
    responsive?: boolean;
    touch?: boolean;
    accessible?: boolean;
    audio?: string;
    [k: string]: unknown;
  };
  preferredLayout?: Layout;
  preferredWidth?: number;
  preferredHeight?: number;
  languages?: {
    presets: Record<string, LanguagePreset>;
  };
}

export type GameFactory = (
  container: HTMLElement,
  bridge: Bridge,
  ctx?: GameContext,
) => (() => void) | void;

type Caputchin = {
  games: Record<string, GameFactory>;
  manifests: Record<string, GameManifest>;
};

export function register(manifest: GameManifest, factory: GameFactory): void {
  if (!manifest || typeof manifest.id !== 'string' || manifest.id.length === 0) {
    console.warn('[caputchin/game-sdk] register() called with a manifest missing `id`; skipping');
    return;
  }

  const g = globalThis as Record<string, unknown>;

  if (!g['Caputchin']) {
    console.warn(
      '[caputchin/game-sdk] Caputchin global not found; was the SDK loaded outside a Caputchin iframe?',
    );
    g['Caputchin'] = { games: {}, manifests: {} } satisfies Caputchin;
  }

  const caputchin = g['Caputchin'] as Caputchin;
  if (!caputchin.manifests) caputchin.manifests = {};
  if (!caputchin.games) caputchin.games = {};

  if (Object.prototype.hasOwnProperty.call(caputchin.games, manifest.id)) {
    console.warn(`[caputchin/game-sdk] duplicate game id "${manifest.id}"; last-write-wins`);
  }

  caputchin.games[manifest.id] = factory;
  caputchin.manifests[manifest.id] = manifest;
}
