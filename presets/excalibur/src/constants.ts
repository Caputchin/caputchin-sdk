// Fixed-step timing shared by the live driver and the headless pump. The whole
// determinism story rests on advancing the sim by EXACTLY this many ms per
// logical tick on both ends, so a 50 Hz integer step (20 ms, exact in binary,
// no accumulation drift) is used rather than 1000/60. Live play is bounded by
// Excalibur's own per-frame catch-up clamp; the pump runs until the sim ends or
// the per-game tick ceiling, so no extra timing knobs are needed here.

/** Milliseconds of virtual time per logical sim tick (50 Hz). */
export const FIXED_TIMESTEP_MS = 20;

/** Excalibur `fixedUpdateFps` matching {@link FIXED_TIMESTEP_MS}. */
export const FIXED_UPDATE_FPS = 50;
