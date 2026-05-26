import type { EngineDef } from './types';

/**
 * Identity helper that a game uses to declare its engine, purely for type
 * inference — `defineEngine` does not wrap or transform the reducer. Export the
 * result as the default (or a named) export of the game's `./engine` module:
 *
 * ```ts
 * export default defineEngine<MyState, MyAction, MyConfig>({
 *   init({ seed, config }) { ... },
 *   step(state, action) { ... },
 *   tick(state) { ... },
 *   isOver(state) { ... },
 *   result(state) { return { score: state.score }; },
 * });
 * ```
 */
export function defineEngine<S, A = unknown, C = unknown, V = S>(
  def: EngineDef<S, A, C, V>,
): EngineDef<S, A, C, V> {
  return def;
}
