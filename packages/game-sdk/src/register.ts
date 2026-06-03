import type { Bridge } from './bridge';
import type { GameContext } from './context';

/** The function you hand to {@link register}. The widget calls it once per
 *  mount with the `container` element to render into, the {@link Bridge}
 *  control surface, and the per-session {@link GameContext} (seed, locale,
 *  skin, config). Return an optional cleanup function the widget calls when the
 *  round tears down. */
export type GameFactory = (
  container: HTMLElement,
  bridge: Bridge,
  ctx?: GameContext,
) => (() => void) | void;

type Caputchin = {
  games: Record<string, GameFactory>;
};

/** Fallback registry key used when no `data-game-id` is available on the
 *  iframe runtime script tag. Each iframe only ever loads one game, so a
 *  single fixed slot is enough. Exported so the widget's iframe runtime +
 *  tests can reference the same constant. */
export const DEFAULT_REGISTRY_KEY = '__caputchin_default__';

/** Resolve the registry key the SDK stores the factory under:
 *
 *   1. `<script data-game-id="…">` in the current document (the iframe
 *      runtime sets this from the widget's `game` attribute).
 *   2. {@link DEFAULT_REGISTRY_KEY} as a final fallback. */
function resolveRegistryKey(): string {
  if (typeof document !== 'undefined') {
    const tag = document.querySelector('script[data-game-id]');
    const attr = tag ? tag.getAttribute('data-game-id') : null;
    if (attr && attr.length > 0) return attr;
  }
  return DEFAULT_REGISTRY_KEY;
}

/** Register the game's factory with the iframe's Caputchin global; the widget
 *  iframe runtime invokes it on kickoff. No manifest is passed: the SERVER
 *  resolves presets + the preferred footprint (from the indexed `caputchin.json`
 *  / dashboard-authored schemas) and ships them down via the bootstrap +
 *  kickoff message, so the in-frame manifest is never read at runtime. The
 *  `caputchin.json` file stays the author + marketplace-indexer source of truth
 *  (typed by {@link GameManifest}); it just isn't handed to `register`. */
export function register(factory: GameFactory): void {
  const key = resolveRegistryKey();

  const g = globalThis as Record<string, unknown>;

  if (!g['Caputchin']) {
    console.warn(
      '[caputchin/game-sdk] Caputchin global not found; was the SDK loaded outside a Caputchin iframe?',
    );
    g['Caputchin'] = { games: {} } satisfies Caputchin;
  }

  const caputchin = g['Caputchin'] as Caputchin;
  if (!caputchin.games) caputchin.games = {};

  if (Object.prototype.hasOwnProperty.call(caputchin.games, key)) {
    console.warn(`[caputchin/game-sdk] duplicate registry key "${key}"; last-write-wins`);
  }

  caputchin.games[key] = factory;
}
