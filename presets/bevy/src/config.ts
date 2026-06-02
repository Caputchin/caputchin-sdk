// Encode the opaque, server-sourced config into the flat i32 array the sim
// reads (lib.rs decodes config[0] as the tap target). The SAME function must run
// in your live build so both ends resolve config identically. Keep it pure and
// integer-valued.
export function configToInts(config: Record<string, unknown> | null | undefined): Int32Array {
  const target = typeof config?.target === 'number' ? config.target : 5;
  return Int32Array.from([Math.max(1, Math.trunc(target))]);
}
