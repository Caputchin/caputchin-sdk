# Function: makePhaserRun()

> **makePhaserRun**\<`Action`, `C`\>(`opts`): `RunFn`\<`C`\>

Build a conforming `run(seed, config, trace) => Verdict` backed by a headless
Phaser game running REAL Phaser physics. The preset makes the physics
deterministic (fixed step + seeded RNG + deterministic transcendentals applied
here and, via `@caputchin/preset-phaser/live`, in the browser), so the same
scene the player ran replays bit-for-bit on the server.

The driver advances `headlessStep` at a fixed delta (one worldstep per call)
until the recorded trace is exhausted or the round ends, then reads the verdict.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `Action` | - |
| `C` | `unknown` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `opts` | [`MakePhaserRunOptions`](index.Interface.MakePhaserRunOptions.md)\<`Action`, `C`\> |

## Returns

`RunFn`\<`C`\>
