import type Phaser from 'phaser';

/**
 * Subscribe a callback to fire ONCE per fixed Arcade physics step.
 *
 * This is the determinism-safe place to advance per-tick game logic (read input,
 * set body velocities, score) on BOTH the live game and the headless replay.
 * Phaser's Arcade world (with `fixedStep: true`) advances in fixed sub-steps
 * regardless of frame rate, emitting this event once per sub-step — so a 144 Hz
 * player and a 60 Hz player record the same per-step action sequence, and the
 * server replays it bit-for-bit. Doing the same work in the scene's `update()`
 * (once per rendered frame) would be frame-rate dependent and would NOT replay.
 *
 * Velocities written in the callback are applied to that same step's integration.
 *
 * Wrap the stepped callback in a {@link createMathRandomTrap} (from
 * `@caputchin/determinism`, re-exported by this preset) so any raw `Math.random`
 * an engine reads in the step is seeded identically live and on the server.
 */
export function onWorldStep(scene: Phaser.Scene, cb: () => void): void {
  // 'worldstep' === Phaser.Physics.Arcade.Events.WORLD_STEP (hard-coded so the
  // preset needs no runtime phaser value import; the name is stable in Phaser 4).
  scene.physics.world.on('worldstep', cb);
}
