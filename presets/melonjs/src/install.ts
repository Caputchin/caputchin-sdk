// Side-effect entry for the HEADLESS replay artifact. Import it FIRST in your run
// entry, before anything that imports melonjs:
//
//   import '@caputchin/preset-melonjs/install'; // must be first
//   import { toRun } from '@caputchin/preset-melonjs';
//   import { engine } from './sim/engine.js';
//
// Its ONE job is the determinism concern that must be settled BEFORE melonjs (and
// the core-js polyfills it bundles) evaluate: a seeded `Math.random`. core-js's
// Symbol-polyfill uid seeds itself with `Math.random()` AT MODULE EVALUATION
// (before run() is ever called). The replay isolate bans ambient `Math.random` (a
// read throws), so without a write-only seed installed first, that eval-time call
// throws and the artifact never loads. `seedRandom` assigns without reading, which
// the ban permits; a fixed seed is enough since the value only salts internal
// polyfill ids, never the serializable game state (that is the game's own seeded
// rng plus the trapped physics), so it cannot shift a verdict.
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

seedRandom([0x6d2b79f5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35]);

// Re-export the determinism primitives a melonJS author may compose with, so the
// preset stays a single import site.
export { makeDeterministic, applyHeadlessDom, freezeClock, seedRandom, sealHeadlessAmbient } from '@caputchin/determinism';
