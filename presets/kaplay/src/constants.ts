/**
 * One logical sim tick / one pumped KAPLAY frame, in milliseconds. KAPLAY's
 * default fixed update is 50 Hz, so this is 20 ms. The whole determinism model
 * rests on driving KAPLAY exactly ONE fixed-dt frame per pump in BOTH the
 * browser and the headless replay: each frame then runs one `update` (with
 * `dt()` == this) and one `fixedUpdate`, with identical internal RNG draws and
 * identical physics integration, so `k.rand()` and KAPLAY physics are
 * deterministic across the two environments. The verdict's `durationMs` is
 * `ticks * this`.
 */
export const FIXED_TIMESTEP_MS = 20;

// Max fixed-dt frames the live driver advances in a single real animation frame
// (catch-up after a tab stall). Bounds the spiral-of-death; dropped wall-time is
// skipped, never compressed into a variable-size step.
export const MAX_CATCHUP_FRAMES = 5;

// Frames the load phase may advance before giving up (headless guard).
export const MAX_LOAD_FRAMES = 600;

// Extra ticks pumped after the last recorded input so the sim can settle (a
// final move that completes its effect a few ticks later). Bounded by maxTicks.
export const DRAIN_TICKS = 150;

// Trace codec envelope version. Bumped only on an incompatible format change;
// the trace is opaque to the platform, so this is purely internal to the preset.
export const TRACE_V = 1;
