# caputchin-replay-rs

[![crates.io](https://img.shields.io/crates/v/caputchin-replay-rs.svg)](https://crates.io/crates/caputchin-replay-rs)
[![docs.rs](https://img.shields.io/docsrs/caputchin-replay-rs)](https://docs.rs/caputchin-replay-rs)

Rust authoring crate for [Caputchin](https://caputchin.com) server-validated game replay.

Full API documentation is auto-generated and hosted at [docs.rs/caputchin-replay-rs](https://docs.rs/caputchin-replay-rs).

Caputchin runs a deterministic-replay captcha: your game records an input trace in the browser, and the server re-runs the same simulation over that trace and trusts only the replayed verdict. A conforming replay artifact is a freestanding WASM module that exports a small C-ABI the host marshals into. This crate writes that C-ABI for you, so you only author the deterministic sim.

## Usage

Author a deterministic `run` (seeded only by the four `u32` words, no clock, no host calls), then invoke the macro once at your crate root:

```rust
use caputchin_replay_rs::{caputchin_replay, Verdict};

fn run(seed: [u32; 4], config: &[i32], trace: &[u8]) -> Verdict {
    // Decode config + trace, step the deterministic sim, return the result.
    // config and trace are opaque bytes your game encoded; decode them here.
    Verdict { passed: true, score: 0, duration_ms: 0 }
}

caputchin_replay!(run);
```

Build it as a freestanding wasm artifact:

```toml
# Cargo.toml
[lib]
crate-type = ["cdylib"]
```

```sh
cargo build --release --target wasm32-unknown-unknown
```

The result has no `wasm-bindgen` and no imports. It is the headless module the replay host loads.

## The generated C-ABI

`caputchin_replay!` emits two exports:

- `cap_alloc(len) -> *mut u8`: the host grows linear memory and gets a pointer to fill with the trace bytes and the config `i32` array.
- `cap_run(s0, s1, s2, s3, trace_ptr, trace_len, cfg_ptr, cfg_len) -> *const i32`: runs your `run` and returns a pointer to `[passed, score, duration_ms]` (three little-endian `i32`).

Allocations are leaked on purpose: a replay isolate runs one round and is discarded.

## Where it fits

- `config` and `trace` are opaque to this crate. Your `run` decodes whatever your game encoded; the same encoder runs in your browser build.
- The JS host that loads the module and calls these exports is `@caputchin/replay-wasm`.
- The `Verdict` and `Seed` shapes are owned by `@caputchin/replay-contract`.

## License

Apache-2.0
