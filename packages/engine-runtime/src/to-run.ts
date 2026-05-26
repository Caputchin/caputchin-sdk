// `toRun` — the reducer→contract adapter (ADR-0069). It turns a `defineEngine`
// reducer into the one mandatory `run(seed, config, trace) -> verdict` the
// artifact exports. This is the kit's whole reason to exist: the author writes
// pure game logic, the kit produces the conforming `run`. Using it is OPTIONAL —
// an author may hand-write a `run` and skip the kit entirely.

import { replay } from './harness';
import { decodeTrace } from './trace-codec';
import type { EngineDef, ReplayOutcome, TickInput } from './types';
import type { Seed, Verdict } from '@caputchin/replay-contract';

export interface ToRunOptions<A, C> {
  /**
   * The config the run falls back to when invoked with `null` config (ADR-0069):
   * the server passes `null` until per-site config injection lands, so the run
   * uses these defaults. When the server DOES supply a config it is used as-is —
   * config is a run INPUT, never baked, so the same artifact serves every preset.
   */
  readonly defaultConfig: C;
  /** Upper bound on ticks; a run that exceeds it is truncated and fails. */
  readonly maxTicks: number;
  /**
   * Pass/fail decision over the authoritative replay outcome + the resolved
   * config. Read the gate threshold (e.g. `passScore`) from `config` here — it is
   * server-supplied, so it is safe; never derive the gate from the trace.
   */
  passed(outcome: ReplayOutcome, config: C): boolean;
  /**
   * Decode the opaque trace into recorded inputs. Defaults to the kit's
   * {@link decodeTrace}; supply your own to read a custom trace format.
   */
  decode?(trace: Uint8Array | string): readonly TickInput<A>[];
}

/**
 * Adapt a reducer + options into a `run` that conforms to the `RunFn` contract
 * in `@caputchin/replay-contract`. The returned `run`: resolves the config
 * (server value, or `defaultConfig` when `null`), decodes the trace (a
 * malformed/empty blob yields a failing verdict rather than throwing, so the
 * index conformance smoke always gets a verdict), replays the reducer over
 * `(seed, config, inputs)`, and maps the outcome to a verdict. A truncated
 * (non-terminating) run always fails regardless of the predicate. The result is
 * synchronous (the replay loop is), which still satisfies the sync-or-async
 * `RunFn` contract.
 */
export function toRun<S, A, C, V>(
  engine: EngineDef<S, A, C, V>,
  opts: ToRunOptions<A, C>,
): (seed: Seed, config: C | null, trace: Uint8Array | string) => Verdict {
  const decode: (trace: Uint8Array | string) => readonly TickInput<A>[] =
    opts.decode ?? decodeTrace;

  return (seed: Seed, config: C | null, trace: Uint8Array | string): Verdict => {
    const resolved = config ?? opts.defaultConfig;
    let inputs: readonly TickInput<A>[];
    try {
      inputs = decode(trace);
    } catch {
      return { passed: false, score: 0, durationMs: 0 };
    }
    const outcome = replay(engine, {
      seed,
      config: resolved,
      actions: inputs,
      maxTicks: opts.maxTicks,
    });
    const passed = !outcome.truncated && opts.passed(outcome, resolved);
    return { passed, score: outcome.score, durationMs: outcome.durationMs };
  };
}
