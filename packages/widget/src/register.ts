import { installCustomFetch } from './cap/custom-fetch.js';
import { CaputchinWidget } from './elements/widget.js';
import { CaputchinGame } from './elements/game.js';

/**
 * Register both custom elements (`<caputchin-widget>`, `<caputchin-game>`) and
 * install the Cap fetch hook. This is the single side effect both the ESM
 * entry (src/index.ts) and the IIFE entry (src/entries/widget.ts) run on load,
 * so the registration logic lives in one place.
 *
 * Idempotent: each `define` is guarded by `customElements.get`, and
 * `installCustomFetch` self-guards, so repeat calls are no-ops.
 *
 * SSR-safe: no-ops when there is no `window` (server render / build pass), so
 * `import '@caputchin/widget'` never throws off-browser. Fails loud when run
 * in a browser that lacks Custom Elements support, where the widget genuinely
 * cannot work and a silent skip would hide the breakage.
 */
export function defineCaputchinElements(): void {
  if (typeof window === 'undefined') return;

  // Access the registry through `window` so the support check and the
  // define calls read the same object the `window` guard above proved
  // exists (no mixing a bare global with a `window`-qualified check).
  const registry = window.customElements;
  if (!registry) {
    throw new Error(
      '[caputchin] Custom Elements are not supported in this browser; ' +
        '<caputchin-widget> and <caputchin-game> cannot be registered.',
    );
  }

  installCustomFetch();

  if (!registry.get('caputchin-widget')) {
    registry.define('caputchin-widget', CaputchinWidget);
  }
  if (!registry.get('caputchin-game')) {
    registry.define('caputchin-game', CaputchinGame);
  }
}
