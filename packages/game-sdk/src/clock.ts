/**
 * Build the driver's wall-clock reader: prefers the view's `performance.now()`
 * (monotonic, sub-millisecond) and falls back to `Date.now()` when the view has
 * no `performance` (older embedders, some test doubles).
 *
 * DRIVER/render timing ONLY — the returned reader is for pacing the live rAF
 * loop and animations, never a sim input (the sim advances on logical ticks, not
 * wall time). A game's mount typically lets callers override it for tests:
 * `const now = opts.now ?? makeNow(view);`
 *
 * @param view - the game's window-like view (e.g. `doc.defaultView`).
 */
export function makeNow(view: { performance?: { now?: () => number } }): () => number {
  return () => (view.performance?.now ? view.performance.now() : Date.now());
}
