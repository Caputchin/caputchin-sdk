// Side-effect entry for the HEADLESS replay artifact. Import it FIRST in your run
// entry, before anything that imports melonjs:
//
//   import '@caputchin/preset-melonjs/install'; // must be first
//   import { toRun } from '@caputchin/preset-melonjs';
//   import { engine } from './sim/engine.js';
//
// It settles two things that MUST be in place BEFORE melonjs (and the core-js +
// Howler it bundles) evaluate. (1) A seeded `Math.random`. core-js's
// Symbol-polyfill uid seeds itself with `Math.random()` AT MODULE EVALUATION
// (before run() is ever called). The replay isolate bans ambient `Math.random` (a
// read throws), so without a write-only seed installed first, that eval-time call
// throws and the artifact never loads. `seedRandom` assigns without reading, which
// the ban permits; a fixed seed is enough since the value only salts internal
// polyfill ids, never the serializable game state (that is the game's own seeded
// rng plus the trapped physics), so it cannot shift a verdict. (2) A `global`
// alias so melonjs's bundled Howler can resolve its global at module eval in the
// no-`global`/no-`window` isolate (see the block below for the full why).
//
// Everything else - the headless DOM shim, the frozen clock, the transcendental
// Math swap, and the NON-CONFIGURABLE seal that keeps the clock + scheduler
// readable through the run-time ambient ban - is applied lazily by the engine in
// `defineMelonGame`'s init(), guarded on a run-time absence of `document`. That
// guard cannot run here: a DOM test runner (happy-dom / jsdom) attaches its
// `document` only AFTER the module graph evaluates, so at this point it looks
// headless even in a test, and sealing the test process's real `setTimeout` /
// `Date` would break the runner. melonjs reads the DOM / clock / scheduler at
// Application construction (run time), not at module eval, so init() is the
// correct, reliably-guarded place for them.
import { seedRandom } from '@caputchin/determinism';

// melonjs bundles Howler, whose UMD footer assigns `HowlerGlobal` / `Howler` onto
// `global` (Node) or `window` (browser) and then reads `HowlerGlobal` BARE
// (`HowlerGlobal.prototype._pos = ...`) at MODULE EVAL. The sealed replay isolate
// (workerd, no nodejs_compat) has NEITHER `global` nor `window` at that point, so
// neither UMD branch defines `HowlerGlobal` on the global scope and the bare read
// throws `ReferenceError: HowlerGlobal is not defined` - before the engine's
// init() DOM shim ever runs. The artifact then never loads, so the game indexes
// browse-only (the self-check reports `selfcheck-error`). Alias `global` ->
// globalThis (only when it is absent, i.e. headless) so the UMD assignment lands
// on the real global object and the bare read resolves. No-op in Node / a DOM
// test runner (where `global` already === globalThis) and skipped in a real
// browser (which has `window`), so the live game realm is untouched. This must
// run BEFORE melonjs evaluates, which it does: the run entry imports this
// side-effect module first (see the file header).
{
  const g = globalThis as unknown as Record<string, unknown>;
  if (typeof g.window === 'undefined' && typeof g.global === 'undefined') {
    g.global = globalThis;
  }
}

seedRandom([0x6d2b79f5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35]);

// Re-export the determinism primitives a melonJS author may compose with, so the
// preset stays a single import site.
export { makeDeterministic, applyHeadlessDom, freezeClock, seedRandom, sealHeadlessAmbient } from '@caputchin/determinism';
