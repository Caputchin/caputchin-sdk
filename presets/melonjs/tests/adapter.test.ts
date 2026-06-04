// Validates the real preset API end-to-end: a melonJS game using the FULL engine
// (me.Application + me.Body physics) expressed as a MelonGameSpec, wrapped by
// defineMelonGame + toRun into a conforming run(seed, config, trace) -> verdict.
// Proves (a) the adapter drives real physics headless, and (b) the SAME
// (seed, config, trace) replays to an identical verdict.

import { describe, it, expect } from 'vitest';
import {
  defineMelonGame,
  toRun,
  encodeTrace,
  type MelonGameSpec,
  type Seed,
  type TickInput,
} from '../src/index.js';

const me = (await import('melonjs')) as unknown as Record<string, any>;

const W = 240;
const H = 200;
const PASS_X = 160; // pass once the ball's x passes this

// One player action: push the ball horizontally (a velocity impulse).
type Action = { push: number };

interface State {
  x: number;
  y: number;
  vx: number;
  maxX: number;
  tick: number;
}

const spec: MelonGameSpec<State, Action, Record<string, unknown>> = {
  me: me as never,
  width: W,
  height: H,
  setup(api) {
    const world = api.app.world;
    // floor + walls (static bodies)
    const mk = (x: number, y: number, w: number, h: number, type: number): void => {
      const r = new api.me.Renderable(x, y, w, h);
      const b = new api.me.Body(r);
      b.addShape(new api.me.Rect(0, 0, w, h));
      b.collisionType = type;
      b.setStatic(true);
      (r as Record<string, unknown>).body = b;
      world.addChild(r);
    };
    mk(0, H - 8, W, 8, api.me.collision.types.WORLD_SHAPE);
    mk(0, 0, 8, H, api.me.collision.types.WORLD_SHAPE);
    mk(W - 8, 0, 8, H, api.me.collision.types.WORLD_SHAPE);

    // the ball (dynamic body, gravity + a seeded initial nudge)
    const ball = new api.me.Renderable(20, 20, 12, 12);
    const bb = new api.me.Body(ball);
    bb.addShape(new api.me.Rect(0, 0, 12, 12));
    bb.collisionType = api.me.collision.types.PLAYER_OBJECT;
    bb.setCollisionMask(api.me.collision.types.ALL_OBJECT);
    bb.gravityScale = 1;
    bb.bounce = 0.4;
    bb.setMaxVelocity(8, 8);
    bb.vel.set(api.rng() * 0.5, 0);
    (ball as Record<string, unknown>).body = bb;
    world.addChild(ball);
    api.ctx.ball = ball;

    return { x: 20, y: 20, vx: bb.vel.x, maxX: 20, tick: 0 };
  },
  input(state, action, api) {
    const ball = api.ctx.ball as { body: { vel: { x: number } } };
    ball.body.vel.x += action.push;
    return state;
  },
  afterStep(state, api) {
    const ball = api.ctx.ball as { pos: { x: number; y: number }; body: { vel: { x: number } } };
    const x = ball.pos.x;
    return {
      x,
      y: ball.pos.y,
      vx: ball.body.vel.x,
      maxX: Math.max(state.maxX, x),
      tick: state.tick + 1,
    };
  },
  isOver(state) {
    return state.maxX >= PASS_X || state.tick >= 600;
  },
  result(state) {
    return { score: Math.floor(state.maxX), passed: state.maxX >= PASS_X };
  },
};

const run = toRun(defineMelonGame(spec), { maxTicks: 700 });

const SEED: Seed = [0xabcd, 0x1234, 0x5678, 0x9876] as unknown as Seed;
// Push right repeatedly so the ball crosses PASS_X.
const TRACE: TickInput<Action>[] = Array.from({ length: 20 }, (_, i) => ({
  tick: i * 5,
  action: { push: 1.2 },
}));
const blob = encodeTrace(TRACE);

describe('defineMelonGame + toRun (real-physics conforming run)', () => {
  it('drives real melonJS physics headless and produces a verdict', () => {
    const v = run(SEED, null, blob);
    expect(v.durationMs).toBeGreaterThan(0);
    expect(typeof v.passed).toBe('boolean');
    expect(v.score).toBeGreaterThan(20);
  });

  it('replays the same (seed, config, trace) to an identical verdict', () => {
    const a = run(SEED, null, blob);
    const b = run(SEED, null, blob);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it('a malformed trace fails safely (no throw)', () => {
    const v = run(SEED, null, new Uint8Array([0xff, 0x01, 0x02]));
    expect(v.passed).toBe(false);
  });
});
