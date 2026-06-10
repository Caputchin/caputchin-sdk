// Proves the preset lets a game use Excalibur's NATIVE engine systems inside the
// deterministic headless replay isolate - the whole point of building a first-party
// game on the engine. Each game below uses a real engine system and is replayed
// through excaliburRun: it must be run-to-run identical AND clean under the platform
// self-check (no ambient access). `./install` first so the headless shim is in place.
//   1. native pointer events  - the preset injects the recorded trace into
//      engine.input.pointers (session.ts), so an Actor's pointer handler + the
//      PointerSystem hit-test fire headless from the trace alone.
//   2. collision              - Collider + CollisionSystem (`collisionstart`).
//   3. physics                - BodyComponent integration + the collision solver.
import './install';
import * as ex from 'excalibur';
import { describe, expect, it } from 'vitest';
import { selfCheckRun } from '@caputchin/replay-selfcheck';
import type { Seed } from '@caputchin/replay-contract';
import { defineExcaliburGame } from './define-game';
import { excaliburRun } from './run';
import { encodeTrace, type RecordedEvent } from './trace';

const SEED: Seed = [1, 2, 3, 4];

// 1. Native pointer events: the game only adds an Actor with a pointer handler; the
//    PRESET drives it from the recorded trace (no engine internals touched here).
const inputGame = defineExcaliburGame(
  (engine, api) => {
    let hits = 0;
    const target = new ex.Actor({ pos: ex.vec(200, 150), width: 80, height: 80, color: ex.Color.Red });
    target.on('pointerdown', () => {
      hits = (hits + 1) >>> 0;
    });
    engine.add(target);
    api.onTick(() => {
      api.setScore(hits);
      if (api.tick >= 25) {
        if (hits > 0) api.pass();
        api.gameOver();
      }
    });
  },
  { width: 400, height: 300, maxTicks: 80 },
);
const runInput = excaliburRun(inputGame);
const hitTrace: RecordedEvent[] = [
  { tick: 3, t: 0, k: 0, x: 200, y: 150 },
  { tick: 3, t: 0, k: 2, x: 200, y: 150 },
  { tick: 8, t: 0, k: 0, x: 200, y: 150 },
  { tick: 8, t: 0, k: 2, x: 200, y: 150 },
];

// 2. Collision: a moving Active body crosses into a Fixed body; collisionstart fires.
const collisionGame = defineExcaliburGame(
  (engine, api) => {
    let collided = 0;
    const a = new ex.Actor({ pos: ex.vec(100, 150), width: 40, height: 40, color: ex.Color.Green });
    a.body.collisionType = ex.CollisionType.Active;
    a.vel = ex.vec(120, 0);
    const b = new ex.Actor({ pos: ex.vec(300, 150), width: 40, height: 40, color: ex.Color.Blue });
    b.body.collisionType = ex.CollisionType.Fixed;
    a.on('collisionstart', () => {
      collided = (collided + 1) >>> 0;
    });
    engine.add(a);
    engine.add(b);
    api.onTick(() => {
      api.setScore(((collided << 20) | (Math.round(a.pos.x) & 0xfffff)) >>> 0);
      if (api.tick >= 120) {
        if (collided > 0) api.pass();
        api.gameOver();
      }
    });
  },
  { width: 400, height: 300, maxTicks: 160 },
);
const runCollision = excaliburRun(collisionGame);

// 3. Physics: a body under acceleration falls onto a Fixed floor; the solver settles it.
const physicsGame = defineExcaliburGame(
  (engine, api) => {
    const ball = new ex.Actor({ pos: ex.vec(200, 30), width: 24, height: 24, color: ex.Color.Orange });
    ball.body.collisionType = ex.CollisionType.Active;
    ball.acc = ex.vec(0, 600);
    const floor = new ex.Actor({ pos: ex.vec(200, 280), width: 400, height: 24, color: ex.Color.Gray });
    floor.body.collisionType = ex.CollisionType.Fixed;
    engine.add(ball);
    engine.add(floor);
    let s = 0;
    api.onTick(() => {
      s = (s + (Math.round(ball.pos.y) & 0xffff)) >>> 0;
      api.setScore(s);
      if (api.tick >= 90) {
        api.pass();
        api.gameOver();
      }
    });
  },
  { width: 400, height: 300, maxTicks: 140 },
);
const runPhysics = excaliburRun(physicsGame);

describe('preset hosts Excalibur native systems deterministically headless', () => {
  it('native pointer events: an Actor pointer handler fires from the trace, deterministically', async () => {
    const a = await runInput(SEED, null, encodeTrace(hitTrace));
    const b = await runInput(SEED, null, encodeTrace(hitTrace));
    expect(a).toEqual(b);
    expect(a.passed).toBe(true); // the handler fired headless (hits > 0)
    expect(a.score).toBe(2); // exactly the two down events hit the target collider
  });

  it('native pointer events are self-check clean', async () => {
    expect((await selfCheckRun(runInput)).ok).toBe(true);
  });

  it('collision: collisionstart fires headless, deterministically', async () => {
    const a = await runCollision(SEED, null, '');
    const b = await runCollision(SEED, null, '');
    expect(a).toEqual(b);
    expect(a.passed).toBe(true);
  });

  it('collision is self-check clean', async () => {
    expect((await selfCheckRun(runCollision)).ok).toBe(true);
  });

  it('physics: body integration + solver are deterministic headless', async () => {
    const a = await runPhysics(SEED, null, '');
    const b = await runPhysics(SEED, null, '');
    expect(a).toEqual(b);
  });

  it('physics is self-check clean', async () => {
    expect((await selfCheckRun(runPhysics)).ok).toBe(true);
  });
});
