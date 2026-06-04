// Browser-side live-stepping driver for a Lane-2 game whose sim wasm exports the
// `caputchin_live!` C-ABI (live_new / live_step / live_state / live_trace /
// live_free). This is the renderer-AGNOSTIC counterpart to `runWithModule` (the
// replay side): it instantiates the SAME wasm in the browser, steps it at the
// game's fixed tick, reads the render-state words out of linear memory, and pulls
// the recorded trace. The renderer (OGL / Three / Pixi / Kontra / ...) is the
// author's choice and lives outside this kit; it simply draws the state words this
// returns and never reaches the server.

import type { Seed } from '@caputchin/replay-contract';
import { inflateWasm } from './wasm-inline.js';

interface LiveExports {
  memory: WebAssembly.Memory;
  cap_alloc(len: number): number;
  live_new(
    s0: number,
    s1: number,
    s2: number,
    s3: number,
    cfgPtr: number,
    cfgLen: number,
  ): number;
  live_step(game: number, inPtr: number, inLen: number): void;
  live_state(game: number, outLen: number): number;
  live_trace(game: number, outLen: number): number;
  live_free(game: number): void;
}

/** Upper bound on the per-tick input words, so the input scratch is allocated once
 *  (no per-frame allocation). Lane-2 inputs are a handful of ints (cursor, buttons). */
const MAX_INPUT_WORDS = 32;

/**
 * A live play session over a sim wasm built with `caputchin_live!`. Create once,
 * `step` each fixed tick feeding the game's opaque i32 input, `state` each frame
 * to render, `trace` once the round ends, then `free`.
 *
 * The state and input layouts are the game's own contract with its sim/renderer;
 * this kit treats them as opaque i32 words.
 */
export class LiveSim {
  private freed = false;

  private constructor(
    private readonly ex: LiveExports,
    private readonly game: number,
    private readonly inPtr: number, // reusable input scratch
    private readonly lenPtr: number, // reusable usize out-param
  ) {}

  /** Instantiate the gzip+base64-inlined sim wasm (import-free, so empty imports)
   *  and start a session. `configInts` is the SAME array the replay side feeds
   *  `cap_run`, so live and replay run identical params. */
  static async create(
    wasmB64: string,
    seed: Seed,
    configInts: Int32Array | readonly number[],
  ): Promise<LiveSim> {
    const bytes = await inflateWasm(wasmB64);
    const module = await WebAssembly.compile(bytes as unknown as BufferSource);
    const instance = await WebAssembly.instantiate(module, {});
    const ex = instance.exports as unknown as LiveExports;

    const cfg = configInts instanceof Int32Array ? configInts : Int32Array.from(configInts);
    let cfgPtr = 0;
    if (cfg.length > 0) {
      cfgPtr = ex.cap_alloc(cfg.length * 4);
      const dv = new DataView(ex.memory.buffer);
      for (let i = 0; i < cfg.length; i += 1) dv.setInt32(cfgPtr + i * 4, cfg[i]!, true);
    }
    // Allocate the reusable scratch once so stepping + reading never leak per frame.
    const inPtr = ex.cap_alloc(MAX_INPUT_WORDS * 4);
    const lenPtr = ex.cap_alloc(4); // usize on wasm32
    const game = ex.live_new(
      seed[0] >>> 0,
      seed[1] >>> 0,
      seed[2] >>> 0,
      seed[3] >>> 0,
      cfgPtr,
      cfg.length,
    );
    return new LiveSim(ex, game, inPtr, lenPtr);
  }

  /** Advance one fixed tick with the game's opaque i32 input words. */
  step(input: Int32Array | readonly number[]): void {
    const inp = input instanceof Int32Array ? input : Int32Array.from(input);
    const n = Math.min(inp.length, MAX_INPUT_WORDS);
    if (n > 0) {
      const dv = new DataView(this.ex.memory.buffer);
      for (let i = 0; i < n; i += 1) dv.setInt32(this.inPtr + i * 4, inp[i]!, true);
    }
    this.ex.live_step(this.game, n > 0 ? this.inPtr : 0, n);
  }

  /** The current render-state words. Copied out; valid after the call. (A prior
   *  step may have grown + detached the buffer, so memory is re-read here.) */
  state(): Int32Array {
    const ptr = this.ex.live_state(this.game, this.lenPtr);
    const dv = new DataView(this.ex.memory.buffer);
    const count = dv.getUint32(this.lenPtr, true);
    const out = new Int32Array(count);
    for (let i = 0; i < count; i += 1) out[i] = dv.getInt32(ptr + i * 4, true);
    return out;
  }

  /** The recorded input trace (call at round end); submit it via the game-sdk
   *  bridge for server replay. */
  trace(): Uint8Array {
    const ptr = this.ex.live_trace(this.game, this.lenPtr);
    const len = new DataView(this.ex.memory.buffer).getUint32(this.lenPtr, true);
    return new Uint8Array(this.ex.memory.buffer, ptr, len).slice();
  }

  free(): void {
    if (this.freed) return;
    this.freed = true;
    this.ex.live_free(this.game);
  }
}
