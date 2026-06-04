// `toRun` - the reducer→contract adapter. It turns a `defineEngine`
// reducer into the one mandatory `run(seed, config, trace) -> verdict` the
// artifact exports. This is the kit's whole reason to exist: the author writes
// pure game logic, the kit produces the conforming `run`. Using it is OPTIONAL -
// an author may hand-write a `run` and skip the kit entirely.

import { replay } from './harness';
import { decodeTrace } from './trace-codec';
import type { EngineDef, TickInput } from './types';
import type { Seed, Verdict } from '@caputchin/replay-contract';

/**
 * Options for {@link toRun}.
 */
export interface ToRunOptions<A> {
  /**
   * Maximum number of fixed timesteps the replay loop may advance before
   * declaring the run truncated and returning `passed: false`. Prevents a
   * non-terminating engine from hanging the server isolate. Set this to a
   * value safely above the longest legitimate play session; a typical
   * 30-second game at {@link FIXED_TIMESTEP_MS} fits in ~1875 ticks.
   */
  readonly maxTicks: number;
  /**
   * Decode the opaque trace bytes into recorded inputs before replaying.
   * Defaults to the kit's built-in {@link decodeTrace} (matches the widget's
   * built-in encoder); supply your own function to read a custom trace format.
   * @param trace - Raw trace blob as emitted by the live game.
   * @returns Ordered array of tick-stamped inputs to feed the replay loop.
   */
  decode?(trace: Uint8Array | string): readonly TickInput<A>[];
}

/**
 * Adapt a reducer into a `run` that conforms to the `RunFn` contract in
 * `@caputchin/replay-contract`. The returned `run`: decodes the trace (a
 * malformed/empty blob yields a failing verdict rather than throwing, so the
 * index conformance smoke always gets a verdict), replays the reducer over
 * `(seed, config, inputs)`, and maps the outcome to a verdict.
 *
 * The config (server-resolved, possibly `null`) is passed STRAIGHT to
 * `engine.init`; the engine owns the config->sim transform AND its own
 * `null`->defaults resolution, so the same `engine.init` runs for both live play
 * and replay (no external transform that can drift). The pass decision is the
 * engine's (`outcome.passed` via `engine.result`); `toRun` only ANDs in the
 * truncated guard - a non-terminating run always fails. The result is
 * synchronous (the replay loop is), which still satisfies the sync-or-async
 * `RunFn` contract.
 */
export function toRun<S, A, C, V>(
  engine: EngineDef<S, A, C, V>,
  opts: ToRunOptions<A>,
): (seed: Seed, config: C | null, trace: Uint8Array | string) => Verdict {
  const decode: (trace: Uint8Array | string) => readonly TickInput<A>[] =
    opts.decode ?? decodeTrace;

  return (seed: Seed, config: C | null, trace: Uint8Array | string): Verdict => {
    let inputs: readonly TickInput<A>[];
    try {
      inputs = decode(trace);
    } catch {
      return { passed: false, score: 0, durationMs: 0 };
    }
    const outcome = replay(engine, {
      seed,
      config,
      actions: inputs,
      maxTicks: opts.maxTicks,
    });
    return {
      passed: !outcome.truncated && outcome.passed,
      score: outcome.score,
      durationMs: outcome.durationMs,
    };
  };
}
