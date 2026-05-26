import type { EngineDef } from './types';

/**
 * Identity helper a game uses to declare its reducer, purely for type inference
 * — `defineEngine` does not wrap or transform it. Pair it with `toRun` to
 * produce the conforming `run(seed, trace)` the artifact exports (ADR-0069);
 * `defineEngine` is one OPTIONAL authoring lane, not the mandatory contract.
 *
 * ```ts
 * const engine = defineEngine<MyState, MyAction, MyConfig>({
 *   init({ seed, config }) { ... },
 *   step(state, action) { ... },
 *   tick(state) { ... },
 *   isOver(state) { ... },
 *   result(state) { return { score: state.score }; },
 * });
 * export const run = toRun(engine, { config, maxTicks, passed });
 * ```
 */
export function defineEngine<S, A = unknown, C = unknown, V = S>(
  def: EngineDef<S, A, C, V>,
): EngineDef<S, A, C, V> {
  return def;
}
