/**
 * @module @caputchin/determinism
 *
 * Make a JS environment behave deterministically, so the SAME code produces the
 * SAME result in the browser (live play) and on the server (replay). The browser
 * game and the server isolate both import this kit and run in the same prepared
 * environment.
 *
 * It provides the determinism primitives a replay preset / author composes:
 * - {@link capMath} + {@link swapMath} / {@link makeDeterministic} — deterministic
 *   transcendentals (fdlibm kernels, bit-identical operations only) and the swap
 *   that points the engine-visible `Math.*` at them.
 * - {@link rng} / {@link rngFromState} — the seeded, fully-serializable PRNG
 *   (sfc32, int32-only), the other deterministic primitive an author opts into.
 * - {@link mulberry32} + {@link createMathRandomTrap}: a cross-engine-stable PRNG
 *   and a scoped `Math.random` trap a framework preset applies around the stepped
 *   callback, so raw `Math.random` reads are seeded identically live and on replay.
 * - {@link applyShim} — the strict-JS-lane ban: swap Math + replace every
 *   non-deterministic global with a loud thrower (from the canonical
 *   {@link AMBIENT_SURFACES} registry).
 * - {@link applyHeadlessDom} + {@link freezeClock} — the headless boot env: no-op
 *   DOM stubs so a browser-targeted engine instantiates inside a sealed isolate,
 *   plus an explicit wall-clock freeze. Server / replay side only.
 * - {@link withDeterministicEnv} — a scoped (restorable) trap that wraps one
 *   fixed-step `update(dt)` in swapped Math + seeded `Math.random` + a frozen
 *   clock, for engines that read those per step.
 * - {@link AMBIENT_SURFACES} / {@link PROBE_SURFACES} / {@link bannedProxy} — the
 *   canonical non-deterministic-surface registry the shim AND the replay
 *   self-check prober both project from (so the two never drift).
 *
 * It is a focused determinism primitive, not a game-authoring model: it imposes
 * no reducer, no contract, no engine. A framework preset depends on it to make
 * the bundled engine deterministic and bootable headless, then pairs it with a
 * fixed-step seeded loop for full determinism.
 */

export * from './math';
export { swapMath, swapMathInto, resolveMathScope, makeDeterministic, seedRandom, withDeterministicEnv, SWAPPED_MATH_KEYS } from './env';
export type { DeterministicEnv } from './env';
export { applyHeadlessDom, freezeClock, sealHeadlessAmbient } from './headless-dom';
export { rng, rngFromState } from './rng';
export type { Rng, RngState } from './rng';
export { mulberry32, createMathRandomTrap } from './math-random';
export type { MathRandomTrap } from './math-random';
export { applyShim } from './shim';
export { AMBIENT_SURFACES, PROBE_SURFACES, BAN_ALL_SURFACES, bannedProxy } from './ambient';
export type { AmbientKind, AmbientSurface } from './ambient';
export { ENV_VERSION } from './version';
