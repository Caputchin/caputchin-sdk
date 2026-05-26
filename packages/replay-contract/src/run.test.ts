import { describe, it, expectTypeOf, expect } from 'vitest';
import { RUN_EXPORT_NAME, RUN_RPC_METHOD, type ReplayConfig, type RunFn } from './run';
import type { Seed } from './seed';
import type { Verdict } from './verdict';

describe('run convention', () => {
  it('pins the export + RPC method names (wire constants)', () => {
    // These names are an agreement between the artifact, the load-time host
    // wrapper, and apps/replay. Changing either is a breaking wire change.
    expect(RUN_EXPORT_NAME).toBe('run');
    expect(RUN_RPC_METHOD).toBe('run');
  });

  it('types a conforming run, sync or async, over (seed, config, trace)', () => {
    const sync: RunFn = (_seed: Seed, _config: ReplayConfig, _trace: Uint8Array | string): Verdict => ({
      passed: true,
      score: 1,
      durationMs: 16,
    });
    const async: RunFn = async () => ({ passed: false, score: 0, durationMs: 0 });
    expectTypeOf(sync).toMatchTypeOf<RunFn>();
    expectTypeOf(async).toMatchTypeOf<RunFn>();
  });

  it('parameterizes the config shape; null config is always allowed', () => {
    interface MyConfig { passScore: number }
    const typed: RunFn<MyConfig> = (_seed, config, _trace): Verdict => ({
      passed: (config?.passScore ?? 0) > 0,
      score: 0,
      durationMs: 0,
    });
    // null is assignable to the config param regardless of the author's shape.
    expectTypeOf(typed).parameter(1).toEqualTypeOf<MyConfig | null>();
  });
});
