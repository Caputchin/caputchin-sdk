// @caputchin/replay-contract — the one mandatory surface for server-validated
// game replay (ADR-0069). The single artifact platform, widget, and the optional
// engine kit all agree on: the `run` contract, the Verdict shape, and the
// per-round Seed plus its derivation. Deliberately tiny and dependency-free —
// it is loaded into a sealed replay isolate, so it pulls in nothing.

export type { Seed } from './seed';
export { SEED_WORDS, SEED_BYTES, deriveSeed } from './seed';

export type { Verdict } from './verdict';
export { parseVerdict } from './verdict';

export type { RunFn, ReplayConfig } from './run';
export { RUN_EXPORT_NAME, RUN_RPC_METHOD } from './run';
