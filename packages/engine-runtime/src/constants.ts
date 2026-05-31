/**
 * Fixed simulation timestep in milliseconds. Every engine tick advances the
 * simulation by this amount; play duration is `endTick * FIXED_TIMESTEP_MS`.
 * Integer on purpose so duration arithmetic stays pure-integer with no
 * floating-point drift. 16 ms gives approximately 62.5 logical fps, close
 * enough to 60 fps for a captcha minigame.
 */
export const FIXED_TIMESTEP_MS = 16;

/**
 * Version of the kit's default trace codec envelope. Stamped into every trace
 * this kit encodes; increment only on a structural change to the envelope.
 * This is a kit-internal detail: the platform never inspects trace bytes, so
 * `CODEC_V` is not a wire contract.
 */
export const CODEC_V = 1;
