import type { Seed, Verdict } from '@caputchin/replay-contract';

/**
 * The C-ABI a Caputchin headless replay module exports, as emitted by the
 * `caputchin-replay-rs` macro: a bump `cap_alloc` plus `cap_run`.
 */
interface CapExports {
  memory: WebAssembly.Memory;
  cap_alloc(len: number): number;
  cap_run(
    s0: number,
    s1: number,
    s2: number,
    s3: number,
    tracePtr: number,
    traceLen: number,
    cfgPtr: number,
    cfgLen: number,
  ): number;
}

/** Decode a trace to bytes; pass it through if it is already bytes. */
export function toBytes(trace: Uint8Array | string): Uint8Array {
  if (typeof trace !== 'string') return trace;
  const bin = atob(trace);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Replay one round over a precompiled headless WASM module that exports the
 * Caputchin C-ABI (`cap_alloc` / `cap_run`, see `caputchin-replay-rs`).
 *
 * The module is freestanding (no imports), so it is instantiated with an empty
 * import object. `config` is **opaque** to this kit: the caller passes the
 * already-encoded `i32` array its game uses, and the game's WASM decodes it.
 * Only ever instantiates a precompiled {@link WebAssembly.Module}; it never
 * compiles bytes, which a replay isolate forbids.
 *
 * @param wasmModule - the precompiled headless module.
 * @param seed - the four-word per-round seed (from `@caputchin/replay-contract`).
 * @param configInts - the game-encoded config as an `i32` array (opaque here).
 * @param trace - the recorded input trace, as bytes or a base64 string.
 * @returns the replayed {@link Verdict}.
 */
export function runWithModule(
  wasmModule: WebAssembly.Module,
  seed: Seed,
  configInts: Int32Array | readonly number[],
  trace: Uint8Array | string,
): Verdict {
  const instance = new WebAssembly.Instance(wasmModule, {});
  const ex = instance.exports as unknown as CapExports;

  const traceBytes = toBytes(trace);
  const cfg = configInts instanceof Int32Array ? configInts : Int32Array.from(configInts);

  // cap_alloc can grow memory and detach the backing ArrayBuffer, so re-read
  // ex.memory.buffer after each allocation before constructing a view over it.
  const tracePtr = traceBytes.length > 0 ? ex.cap_alloc(traceBytes.length) : 0;
  if (tracePtr !== 0) {
    new Uint8Array(ex.memory.buffer, tracePtr, traceBytes.length).set(traceBytes);
  }

  const cfgPtr = cfg.length > 0 ? ex.cap_alloc(cfg.length * 4) : 0;
  if (cfgPtr !== 0) {
    const view = new DataView(ex.memory.buffer);
    for (let i = 0; i < cfg.length; i += 1) view.setInt32(cfgPtr + i * 4, cfg[i], true);
  }

  const verdictPtr = ex.cap_run(
    seed[0] >>> 0,
    seed[1] >>> 0,
    seed[2] >>> 0,
    seed[3] >>> 0,
    tracePtr,
    traceBytes.length,
    cfgPtr,
    cfg.length,
  );

  const v = new DataView(ex.memory.buffer);
  return {
    passed: v.getInt32(verdictPtr, true) !== 0,
    score: v.getInt32(verdictPtr + 4, true),
    durationMs: v.getInt32(verdictPtr + 8, true),
  };
}
