// Side-effect entry for the HEADLESS replay artifact. Import it FIRST in your run
// entry, before anything that imports phaser, so the determinism layer (the
// transcendental Math swap) AND the headless DOM stubs + frozen clock are in place
// before phaser evaluates:
//
//   import '@caputchin/preset-phaser/install'; // must be first
//   import { makePhaserRun } from '@caputchin/preset-phaser';
//   import { createScene } from './sim.js';
//
// The Math swap here is the SAME one the live bundle applies (via
// @caputchin/preset-phaser/live), so the player's browser and the server isolate
// compute identical floats -> Phaser physics replays bit-for-bit. The primitives
// come from @caputchin/determinism (shared across every framework preset).
import { makeDeterministic, applyHeadlessDom, freezeClock } from '@caputchin/determinism';

makeDeterministic(); // swap Math.sin/cos/atan2/... to deterministic kernels (both ends)
applyHeadlessDom(); // window/document/canvas/Image/screen/... so phaser boots with no DOM
freezeClock(); // self-contained frozen Date + performance.now=0: phaser reads Date.now()
               // internally, so give it a deterministic value instead of the live clock.

export { makeDeterministic, applyHeadlessDom, freezeClock } from '@caputchin/determinism';
