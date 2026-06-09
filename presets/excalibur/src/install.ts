// Side-effect entry for the HEADLESS replay artifact. Import it FIRST in your run
// entry, before anything that imports excalibur, so the headless DOM stubs + the
// deterministic Math swap + the frozen clock are in place before excalibur
// evaluates (excalibur reaches for window/document at construction):
//
//   import '@caputchin/preset-excalibur/install'; // must be first
//   import { excaliburRun } from '@caputchin/preset-excalibur';
//   import { game } from './game.js';
//   export const run = excaliburRun(game);
//
// The Math swap here is the SAME one the live mount applies, so the player's
// browser and the server isolate compute identical floats. The primitives come
// from @caputchin/determinism (shared across every framework preset). The run
// adapter re-establishes this env at the start of every run() too (the self-check
// prober shadows globals per call), so this import is the module-load belt to
// that per-call braces.

import { installExcaliburHeadless } from './shim.js';

installExcaliburHeadless();

export { installExcaliburHeadless, installExcaliburDom } from './shim.js';
