import type { ExcaliburGame, ExcaliburGameFactory, ExcaliburGameOptions } from './types';

/**
 * Declare an Excalibur game once; mount it live with {@link mountExcaliburGame} and
 * replay it headless with {@link excaliburRun}. Both ends run the SAME factory over
 * the SAME fixed-dt ticks, so the live result and the server verdict agree by
 * construction.
 */
export function defineExcaliburGame(
  factory: ExcaliburGameFactory,
  options: ExcaliburGameOptions,
): ExcaliburGame {
  return { factory, options };
}
