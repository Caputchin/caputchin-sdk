import type { ParsedConfig } from '../config.js';
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

export function resolveGameId(config: ParsedConfig): string | null {
  if (config.games) return pickFromGamesAttr(config.games);
  return config.game ?? null;
}
