import { pickFromGamesAttr } from '../pool.js';

let widgetIdCounter = 0;

/**
 * Unique per widget mount. Counter + Math.random keeps it stable inside one
 * page session without needing crypto APIs (which may not exist in older
 * WebView contexts on the support matrix).
 */
export function makeWidgetId(): string {
  widgetIdCounter += 1;
  return `cpt_${widgetIdCounter}_${Math.random().toString(36).slice(2, 10)}`;
}

export function resolveGameId(input: { game: string | null; games: string | null }): string | null {
  if (input.games) return pickFromGamesAttr(input.games);
  return input.game ?? null;
}
