// Fixed simulation timestep. Integer milliseconds on purpose: duration is
// derived as `endTick * FIXED_TIMESTEP_MS`, so an integer keeps it pure-integer
// math with zero floating-point drift across runtimes (ADR-0068). 16ms ≈
// 62.5fps effective — close enough to 60fps for a captcha minigame, and the
// tiny clock skew vs wall-time is irrelevant since duration is engine output.
export const FIXED_TIMESTEP_MS = 16;

// Trace envelope schema version (the `v` field). Bump only on a structural
// change to the envelope, independent of shimVersion (behavioral).
export const TRACE_V = 1;
