// `toRun` — the reducer→contract adapter (ADR-0069). It turns a `defineEngine`
// reducer into the one mandatory `run(seed, trace) -> verdict` the artifact
// exports. This is the kit's whole reason to exist: the author writes pure
// game logic, the kit produces the conforming `run`. Using it is OPTIONAL — an
// author may hand-write a `run` and skip the kit entirely.

import { replay } from './harness';
import { decodeTrace } from './trace-codec';
import type { EngineDef, ReplayOutcome, TickInput } from './types';
import type { Seed, Verdict } from '@caputchin/replay-contract';

export interface ToRunOptions<A, C> {
  /**
   * The gameplay config the run executes under. Baked here because ADR-0069
   * makes the run self-contained — the server does not resolve config — so a
   * config-varying game ships per-config artifacts (or carries config in its own
   * trace) at the author's discretion.
   */
  readonly config: C;
  /** Upper bound on ticks; a run that exceeds it is truncated and fails. */
  readonly maxTicks: number;
  /** Pass/fail decision over the authoritative replay outcome. */
  passed(outcome: ReplayOutcome): boolean;
  /**
   * Decode the opaque trace into recorded inputs. Defaults to the kit's
   * {@link decodeTrace}; supply your own to read a custom trace format.
   */
  decode?(trace: Uint8Array | string): readonly TickInput<A>[];
}

/**
 * Adapt a reducer + options into a `run` that conforms to the `RunFn` contract
 * in `@caputchin/replay-contract`. The returned `run`: decodes the trace (a
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
): (seed: Seed, trace: Uint8Array | string) => Verdict {
  const decode: (trace: Uint8Array | string) => readonly TickInput<A>[] =
    opts.decode ?? decodeTrace;

  return (seed: Seed, trace: Uint8Array | string): Verdict => {
    let inputs: readonly TickInput<A>[];
    try {
      inputs = decode(trace);
    } catch {
      return { passed: false, score: 0, durationMs: 0 };
    }
    const outcome = replay(engine, {
      seed,
      config: opts.config,
      actions: inputs,
      maxTicks: opts.maxTicks,
    });
    const passed = !outcome.truncated && opts.passed(outcome);
    return { passed, score: outcome.score, durationMs: outcome.durationMs };
  };
}
