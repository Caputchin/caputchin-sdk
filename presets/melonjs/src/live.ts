// Side-effect entry for the LIVE (browser) bundle. Import it FIRST, before
// melonjs, so the transcendental Math swap is installed before melonjs evaluates:
//
//   import '@caputchin/preset-melonjs/live'; // must be first
//   import * as me from 'melonjs';
//
// It applies the SAME Math swap the headless replay applies (via
// @caputchin/preset-melonjs/install), so the player's browser and the server
// isolate compute identical floats and the me.Body physics produces the
// identical trace, hence the identical verdict.
//
// Only the Math swap runs here. The browser has a real DOM and needs real time,
// so this never applies the headless DOM stubs or the clock freeze. Math.random
// is deliberately NOT seeded live: a persistent override would desync the live
// render stream from the server, which only consumes the seeded stream inside
// each trapped physics step. The per-step trap (createMelonDriver) seeds
// Math.random identically on both ends during the update.
import { makeDeterministic } from '@caputchin/determinism';

makeDeterministic();

export { makeDeterministic } from '@caputchin/determinism';
