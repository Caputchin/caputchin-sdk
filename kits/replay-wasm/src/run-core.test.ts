import { describe, it, expect } from 'vitest';
import { runWithModule } from './run-core.js';
import type { Seed } from '@caputchin/replay-contract';

// A minimal module exporting the Caputchin C-ABI (cap_alloc / cap_run). Its
// cap_run echoes derived inputs so we can assert the host wrote them:
//   passed = traceLen > 0 ; score = traceLen + cfgLen + s0 ; durationMs = 16
// Built from a hand-written WAT via `wasm-tools parse`; bump-allocator memory.
const FIXTURE_B64 =
  'AGFzbQEAAAABEgJgAX8Bf2AIf39/f39/f38BfwMDAgABBQMBAAEGBwF/AUGACAsHIAMGbWVtb3J5AgAJY2FwX2FsbG9jAAAHY2FwX3J1bgABCkMCEQEBfyMAIQEjACAAaiQAIAELLwEBfyMAIQgjAEEMaiQAIAggBUEASzYCACAIIAUgB2ogAGo2AgQgCEEQNgIIIAgLAFQEbmFtZQJEAgACAANsZW4BAXABCQACczABAnMxAgJzMgMCczMECHRyYWNlUHRyBQh0cmFjZUxlbgYGY2ZnUHRyBwZjZmdMZW4IAXYHBwEABG5leHQ=';

const fixtureModule = new WebAssembly.Module(
  Uint8Array.from(atob(FIXTURE_B64), (c) => c.charCodeAt(0)),
);

describe('runWithModule', () => {
  it('marshals seed/config/trace into memory and reads the verdict back', () => {
    const seed: Seed = [3, 0, 0, 0];
    const v = runWithModule(fixtureModule, seed, Int32Array.from([10, 20]), Uint8Array.from([1, 2, 3, 4]));
    expect(v.passed).toBe(true);
    expect(v.score).toBe(4 + 2 + 3); // traceLen + cfgLen + s0
    expect(v.durationMs).toBe(16);
  });

  it('handles an empty trace and empty config', () => {
    const v = runWithModule(fixtureModule, [0, 0, 0, 0], [], new Uint8Array());
    expect(v.passed).toBe(false);
    expect(v.score).toBe(0);
    expect(v.durationMs).toBe(16);
  });

  it('accepts a base64-string trace', () => {
    const v = runWithModule(fixtureModule, [0, 0, 0, 0], [], Buffer.from([1, 2, 3]).toString('base64'));
    expect(v.passed).toBe(true);
    expect(v.score).toBe(3); // traceLen 3 + cfgLen 0 + s0 0
  });

  it('accepts a plain number[] config', () => {
    const v = runWithModule(fixtureModule, [5, 0, 0, 0], [1, 2, 3], Uint8Array.from([9]));
    expect(v.score).toBe(1 + 3 + 5); // traceLen 1 + cfgLen 3 + s0 5
  });
});
