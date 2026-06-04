// Side-effect entry for the LIVE (browser) bundle. Import it FIRST in your live
// entry, before anything that imports phaser:
//
//   import '@caputchin/preset-phaser/live'; // must be first
//   import { register } from '@caputchin/game-sdk';
//   import Phaser from 'phaser';
//
// It applies ONLY the deterministic-transcendental Math swap (NOT the headless DOM
// shim or the clock freeze — the browser has a real DOM and needs real time for
// rendering/audio). This makes the live Phaser physics use the same math as the
// server, so what the player sees matches the server replay. Gameplay randomness
// is seeded separately via Phaser.Math.RandomDataGenerator (seedFromPlatform).
//
// `Math.random` is deliberately NOT seeded here: a persistent override would
// shadow the iframe's real entropy for ALL live code. Instead, wrap the stepped
// sim (the onWorldStep callback) in a createMathRandomTrap() — the SAME scoped
// trap the headless run uses — so the seeded stream is consumed only during the
// verdict-affecting step and render-side code between steps keeps real entropy.
import { makeDeterministic } from '@caputchin/determinism';

makeDeterministic();

export { makeDeterministic } from '@caputchin/determinism';
