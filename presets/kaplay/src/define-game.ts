import type { KaplayGame, KaplayGameOptions, KaplaySceneFactory } from './types';

/**
 * Package a KAPLAY scene factory + options into a {@link KaplayGame} that can be
 * mounted live ({@link mountKaplayGame}) or replayed headless ({@link kaplayRun}).
 *
 * The `factory` builds the scene and registers the sim in `onFixedUpdate`; it
 * receives the live KAPLAY context and the deterministic {@link KaplayGameApi}.
 * Write the sim against the api (named-action input + seeded RNG helpers), keep
 * it free of wall-clock / `Math.random` / `shuffle`, and the same code runs both
 * in the browser and on the server.
 *
 * @example
 * ```ts
 * export const game = defineKaplayGame((k, api) => {
 *   const player = k.add([k.rect(20, 20), k.pos(100, 100)]);
 *   k.onFixedUpdate(() => {
 *     if (api.isDown('left')) player.move(-100, 0);
 *     if (api.isDown('right')) player.move(100, 0);
 *   });
 * }, {
 *   actions: ['left', 'right'],
 *   keys: { left: ['left', 'a'], right: ['right', 'd'] },
 *   maxTicks: 60 * 50,
 *   kaplay: { width: 320, height: 240 },
 * });
 * ```
 */
export function defineKaplayGame(
  factory: KaplaySceneFactory,
  options: KaplayGameOptions,
): KaplayGame {
  return { factory, options };
}
