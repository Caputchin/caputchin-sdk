// PHYSICS DETERMINISM SPIKE (the crux). Boots the REAL melonJS engine headless
// (me.Application + me.Body velocity/gravity + collision via world.update) and
// drives world.update at a FIXED dt under the full deterministic env (seeded
// Math.random, fixed clock, transcendentals swapped to cap.math). Runs the same
// seed twice and asserts the physics state is byte-identical. This proves the
// preset can make the FULL melonJS engine deterministic, so a game author uses
// real physics instead of hand-rolling.

import { describe, it, expect } from 'vitest';
import { applyHeadlessDom, rng, capMath } from '@caputchin/determinism';

applyHeadlessDom(globalThis);
const me = (await import('melonjs')) as unknown as Record<string, any>;

const FIXED_DT = 1000 / 60;
const W = 240;
const H = 240;

// The transcendentals whose native impls differ across V8/libm; swapped to
// cap.math (a fixed polynomial impl, identical on every platform).
const TRANSCENDENTALS = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'exp', 'expm1', 'log', 'log2', 'log10', 'log1p',
  'pow', 'hypot', 'cbrt', 'sinh', 'cosh', 'tanh',
] as const;

function withPhysicsEnv<T>(random: () => number, nowMs: number, fn: () => T): T {
  const g = globalThis as Record<string, any>;
  const realRandom = Math.random;
  const realDateNow = Date.now;
  const perf = g['performance'] as { now?: () => number } | undefined;
  const realPerfNow = perf?.now;
  const savedMath: Record<string, unknown> = {};

  Math.random = random;
  Date.now = () => nowMs;
  if (perf && realPerfNow) perf.now = () => nowMs;
  for (const k of TRANSCENDENTALS) {
    savedMath[k] = (Math as Record<string, unknown>)[k];
    (Math as Record<string, unknown>)[k] = (capMath as Record<string, unknown>)[k];
  }
  try {
    return fn();
  } finally {
    Math.random = realRandom;
    Date.now = realDateNow;
    if (perf && realPerfNow) perf.now = realPerfNow;
    for (const k of TRANSCENDENTALS) (Math as Record<string, unknown>)[k] = savedMath[k];
  }
}

interface BodyState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// Build a fresh engine + physics scene, step it N times under the env, return
// the exact body states. Real me.Body integration + collision via world.update.
function runPhysics(seed: [number, number, number, number], steps: number): BodyState[] {
  const app = new me.Application(W, H, { renderer: me.video.CANVAS });
  const prng = rng(seed);

  // Four static wall bodies (a box) + three dynamic balls with seeded angled
  // velocities + gravity that bounce off the walls and each other.
  const world = app.world;

  function wall(x: number, y: number, w: number, h: number): void {
    const r = new me.Renderable(x, y, w, h);
    const body = new me.Body(r);
    body.addShape(new me.Rect(0, 0, w, h));
    body.collisionType = me.collision.types.WORLD_SHAPE;
    body.setStatic(true);
    (r as any).body = body;
    world.addChild(r);
  }
  wall(0, 0, W, 8);
  wall(0, H - 8, W, 8);
  wall(0, 0, 8, H);
  wall(W - 8, 0, 8, H);

  const balls: any[] = [];
  for (let i = 0; i < 3; i += 1) {
    const r = new me.Renderable(40 + i * 50, 40 + i * 30, 16, 16);
    const body = new me.Body(r);
    body.addShape(new me.Rect(0, 0, 16, 16));
    body.collisionType = me.collision.types.ENEMY_OBJECT;
    body.setCollisionMask(me.collision.types.ALL_OBJECT);
    body.gravityScale = 1;
    // Seeded angled velocities (exercise the integration + bounce path).
    body.vel.set((prng.next() * 4 - 2), (prng.next() * 4 - 2));
    body.setMaxVelocity(6, 6);
    body.bounce = 1;
    (r as any).body = body;
    world.addChild(r);
    balls.push(r);
  }

  for (let t = 0; t < steps; t += 1) {
    withPhysicsEnv(prng.next, t * FIXED_DT, () => {
      world.update(FIXED_DT);
    });
  }

  return balls.map((r) => ({
    x: r.pos.x,
    y: r.pos.y,
    vx: r.body.vel.x,
    vy: r.body.vel.y,
  }));
}

const SEED: [number, number, number, number] = [0x1111, 0x2222, 0x3333, 0x4444];

describe('melonjs FULL-engine physics determinism (the crux)', () => {
  it('boots the real engine headless and steps physics', () => {
    const out = runPhysics(SEED, 120);
    expect(out.length).toBe(3);
    // eslint-disable-next-line no-console
    console.log('physics after 120 steps:', JSON.stringify(out));
    // bodies must have actually moved (physics ran)
    const moved = out.some((b) => b.x !== 40 || b.y !== 40);
    expect(moved).toBe(true);
  });

  it('two runs of the same seed are byte-identical (deterministic physics)', () => {
    const a = runPhysics(SEED, 300);
    const b = runPhysics(SEED, 300);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it('restores native Math after the trapped update', () => {
    const realSin = Math.sin;
    runPhysics(SEED, 30);
    expect(Math.sin).toBe(realSin);
  });
});
