// The conforming replay artifact. caputchin.json `run.entry` pins this; the
// replay isolate loads it and calls run(seed, config, trace). The headless sim
// is the precompiled WASM module ({{project-name}}.wasm, declared in
// run.modules); the isolate supplies it, and @caputchin/replay-wasm instantiates
// it (it never compiles bytes, which the isolate forbids).
import type { RunFn } from '@caputchin/replay-contract';
import { runWithModule } from '@caputchin/replay-wasm';
// @ts-expect-error the loader supplies this precompiled WebAssembly.Module
import wasm from './{{project-name}}.wasm';
import { configToInts } from './config.js';

export const run: RunFn<Record<string, unknown>> = (seed, config, trace) =>
  runWithModule(wasm as WebAssembly.Module, seed, configToInts(config), trace);
