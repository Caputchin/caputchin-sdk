// The conforming replay artifact. The marketplace pins this (caputchin.json
// run.entry) and the replay isolate loads it: it exports run(seed, config, trace)
// -> verdict. The rapier3d sim is the headless WASM module ({{project-name}}.wasm,
// declared in run.modules); the isolate supplies it precompiled, which
// @caputchin/replay-wasm instantiates (never compiling bytes). It is the SAME wasm
// the live build steps via the live_* exports.

import type { RunFn } from '@caputchin/replay-contract';
import { runWithModule } from '@caputchin/replay-wasm';
// @ts-expect-error -- wasm module supplied by the loader
import wasm from './{{project-name}}.wasm';
import { configToInts } from './config.js';

export const run: RunFn<Record<string, unknown>> = (seed, config, trace) =>
  runWithModule(wasm as WebAssembly.Module, seed, configToInts(config), trace);
