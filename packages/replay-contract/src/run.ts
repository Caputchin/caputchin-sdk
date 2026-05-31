// The one mandatory contract: the `run` function shape + invocation convention
// platform, widget, and the optional kit all agree on.

import type { Seed } from './seed';
import type { Verdict } from './verdict';

/**
 * The server-supplied gameplay config a run executes under. OPAQUE to
 * the platform - each game defines its own shape, so we never type or inspect it,
 * exactly like the trace - and NULLABLE: `null` means "use the run's own internal
 * defaults", mirroring the bootstrap config-override's "empty ⇒ game defaults"
 * semantics.
 *
 * Unlike the trace, config is SERVER-sourced (the per-site policy, or the default
 * preset the indexer parsed) and re-resolved server-side at replay, never
 * client-asserted. That is the whole reason it is a distinct input: gate-affecting
 * fields (pass threshold, lives) are safe to read from `config` but would be a
 * bypass if read from the client-emitted `trace`. At MVP the server passes `null`
 * (defaults); per-site config injection is a deferred phase.
 *
 * Authors parameterize the shape for their own ergonomics (`RunFn<MyConfig>`); the
 * platform invokes it as `RunFn` (config opaque).
 */
export type ReplayConfig = unknown;

/**
 * The one mandatory contract. A replayable game ships a JS or WASM module
 * exporting a function of this shape under the name {@link RUN_EXPORT_NAME}:
 *
 * ```
 * run(seed, config, trace) -> { passed, score, durationMs }
 * ```
 *
 * - `seed` is the server-derived per-round {@link Seed} (server round-setup).
 * - `config` is the server-supplied {@link ReplayConfig} (server round-setup,
 *   nullable, opaque). seed + config are the round's server-owned setup; the
 *   trace is the player's input - hence the ordering.
 * - `trace` is the OPAQUE blob the customer's client emitted and this function
 *   alone interprets. We never parse or type its contents - it is raw bytes or a
 *   string, bounded only by a byte cap and the sandbox `cpuMs` limit. There is
 *   deliberately no `Trace` type anywhere: the engine owns its own input stream.
 * - the return is a {@link Verdict}, sync or async (WASM instantiation is async
 *   on first call, so the replay host always awaits it).
 *
 * The function MUST be pure and deterministic ACROSS the player runtime and our
 * server isolate: identical `(seed, config, trace)` MUST yield an identical
 * verdict in both. How (fixed-point, WASM-spec floats, or IEEE-754 + the optional
 * shim) is the author's choice; we only host the replay.
 *
 * @param seed - Server-derived per-round {@link Seed}, issued at
 *   `/verify/start` and re-derived at replay. Never client-supplied.
 * @param config - Server-resolved gameplay config, or `null` when no config
 *   is set for the site key. Gate-affecting fields (pass threshold, lives)
 *   must come from here, not from the trace.
 * @param trace - Opaque player input blob as emitted by the live game client.
 *   Raw bytes or a string; the engine alone interprets it.
 * @returns A {@link Verdict} (sync or async). The replay host always awaits it.
 */
export type RunFn<C = ReplayConfig> = (
  seed: Seed,
  config: C | null,
  trace: Uint8Array | string,
) => Verdict | Promise<Verdict>;

/**
 * The named export the artifact module MUST provide. The replay host looks up
 * exactly this name on the loaded module.
 */
export const RUN_EXPORT_NAME = 'run' as const;

/**
 * The RPC method name the host `WorkerEntrypoint` exposes for invoking the
 * loaded `run`. `apps/replay` calls `stub[RUN_RPC_METHOD](seed, config, trace)`;
 * the load-time wrapper defines a method of this name that forwards to the
 * module's {@link RUN_EXPORT_NAME} export. Sharing the constant keeps the host
 * wrapper and the caller in lockstep.
 */
export const RUN_RPC_METHOD = 'run' as const;
