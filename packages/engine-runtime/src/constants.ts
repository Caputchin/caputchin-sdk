// Fixed simulation timestep. Integer milliseconds on purpose: duration is
// derived as `endTick * FIXED_TIMESTEP_MS`, so an integer keeps it pure-integer
// math with zero floating-point drift across runtimes. 16ms ≈
// 62.5fps effective — close enough to 60fps for a captcha minigame, and the
// tiny clock skew vs wall-time is irrelevant since duration is engine output.
export const FIXED_TIMESTEP_MS = 16;

// Version of the kit's default trace codec envelope (see trace-codec.ts). Bump
// only on a structural change to that envelope. It is a kit detail, not a wire
// contract — the platform never parses the trace.
export const CODEC_V = 1;
