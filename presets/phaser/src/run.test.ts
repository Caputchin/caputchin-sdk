// Dogfood the preset with REAL Phaser Arcade physics: a ball bouncing in a box
// off a static paddle, driven through makePhaserRun, must be deterministic for a
// seed and seed-sensitive across seeds. Per-tick logic runs on the `worldstep`
// event (the frame-rate-independent, replayable place). `./install` is imported
// FIRST so the determinism layer + DOM stubs are in place before phaser evaluates.
import './install.js';
import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { makePhaserRun, onWorldStep, seedFromPlatform } from './index.js';

type Body = Phaser.Physics.Arcade.Body;

const run = makePhaserRun<number>({
  width: 400,
  height: 300,
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, fixedStep: true, fps: 60, debug: false } },
  maxTicks: 600,
  decode: () => [], // empty trace -> run the full maxTicks
  createScene: ({ seed }) => {
    let ball: Phaser.GameObjects.Rectangle;
    let tick = 0;
    return {
      scene: {
        create(this: Phaser.Scene) {
          const rng = seedFromPlatform(seed);
          this.physics.world.setBounds(0, 0, 400, 300);
          ball = this.add.rectangle(200, 150, 14, 14);
          this.physics.add.existing(ball);
          const body = ball.body as Body;
          body.setCollideWorldBounds(true, 1, 1);
          body.setBounce(1, 1);
          this.physics.velocityFromAngle(rng.between(20, 60) * rng.pick([-1, 1]), 180, body.velocity);
          const paddle = this.add.rectangle(40, 150, 12, 70);
          this.physics.add.existing(paddle, true);
          this.physics.add.collider(ball, paddle);
          onWorldStep(this, () => { tick += 1; }); // count fixed steps
        },
      },
      tickCount: () => tick,
      isOver: () => false,
      result: () => ({ score: Math.round((ball.x * 1000 + ball.y) % 1e9), passed: false }),
    };
  },
});

describe('makePhaserRun (real Arcade physics)', () => {
  it('is deterministic for a seed and seed-sensitive across seeds', async () => {
    const a1 = await run([1, 2, 3, 4], null, '');
    const a2 = await run([1, 2, 3, 4], null, '');
    const b = await run([3735928559, 2596069104, 1, 4294967295], null, '');
    expect(a1).toEqual(a2); // bit-for-bit stable under one seed
    expect(a1).not.toEqual(b); // sensitive to the seed
    expect(a1.durationMs).toBe(Math.round(600 * (1000 / 60)));
  });
});
