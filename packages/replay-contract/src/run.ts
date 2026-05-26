// The one mandatory contract: the `run` function shape + invocation convention
// platform, widget, and the optional kit all agree on (ADR-0069).

import type { Seed } from './seed';
import type { Verdict } from './verdict';

/**
 * The one mandatory contract. A replayable game ships a JS or WASM module
 * exporting a function of this shape under the name {@link RUN_EXPORT_NAME}:
 *
 * ```
 * run(seed, trace) -> { passed, score, durationMs }
 * ```
 *
 * - `seed` is the server-derived per-round {@link Seed}.
 * - `trace` is the OPAQUE blob the customer's client emitted and this function
 *   alone interprets. We never parse or type its contents — it is raw bytes or a
 *   string, bounded only by a byte cap and the sandbox `cpuMs` limit. There is
 *   deliberately no `Trace` type anywhere: the engine owns its own input stream.
 * - the return is a {@link Verdict}, sync or async (WASM instantiation is async
 *   on first call, so the replay host always awaits it).
 *
 * The function MUST be pure and deterministic ACROSS the player runtime and our
 * server isolate: identical `(seed, trace)` MUST yield an identical verdict in
 * both. How (fixed-point, WASM-spec floats, or IEEE-754 + the optional shim) is
 * the author's choice; we only host the replay.
 */
export type RunFn = (
  seed: Seed,
  trace: Uint8Array | string,
) => Verdict | Promise<Verdict>;

/**
 * The named export the artifact module MUST provide. The replay host looks up
 * exactly this name on the loaded module.
 */
export const RUN_EXPORT_NAME = 'run' as const;

/**
 * The RPC method name the host `WorkerEntrypoint` exposes for invoking the
 * loaded `run`. `apps/replay` calls `stub[RUN_RPC_METHOD](seed, trace)`; the
 * load-time wrapper defines a method of this name that forwards to the module's
 * {@link RUN_EXPORT_NAME} export. Sharing the constant keeps the host wrapper
 * and the caller in lockstep.
 */
export const RUN_RPC_METHOD = 'run' as const;
