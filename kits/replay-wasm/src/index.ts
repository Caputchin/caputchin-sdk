// @caputchin/replay-wasm - host glue for running a Caputchin headless WASM
// replay artifact. Pairs with the `caputchin-replay-rs` authoring crate (which
// emits the cap_alloc/cap_run C-ABI this kit marshals into) and the
// `@caputchin/replay-contract` types. A game's `run` is typically one line:
//   export const run: RunFn = (seed, config, trace) =>
//     runWithModule(wasm, seed, configToInts(config), trace);

export { inflateWasm } from './wasm-inline.js';
export { runWithModule, toBytes } from './run-core.js';
export { LiveSim } from './live.js';

// Re-export the contract surface so kit consumers have one import site.
export type { Seed, Verdict, RunFn } from '@caputchin/replay-contract';
