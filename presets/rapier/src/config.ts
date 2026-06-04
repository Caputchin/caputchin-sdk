// THE single config transform: maps the opaque, server-sourced config (the
// manifest's snake_case keys) into the flat i32 array `SimConfig::from_ints`
// (sim.rs) reads. Both the live build and the replay (run.ts) pass the SAME array
// into the SAME `from_ints`, so live play and server replay run identical params
// -> identical verdict. The order here is the wire contract with sim.rs.

const TICK_HZ = 60;

const DEFAULTS = {
  targetCatches: 8,
  fallSpeed: 4, // world units/sec
  timeLimitSeconds: 45,
};

function num(cfg: Record<string, unknown> | null, key: string, fallback: number): number {
  const v = cfg?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** [target_catches, fall_speed_milli, time_limit_ticks], mirroring SimConfig::from_ints. */
export function configToInts(config: Record<string, unknown> | null | undefined): Int32Array {
  const c = (config ?? null) as Record<string, unknown> | null;
  return Int32Array.from([
    Math.round(num(c, 'target_catches', DEFAULTS.targetCatches)),
    Math.round(num(c, 'fall_speed', DEFAULTS.fallSpeed) * 1000),
    Math.round(num(c, 'time_limit_seconds', DEFAULTS.timeLimitSeconds) * TICK_HZ),
  ]);
}
