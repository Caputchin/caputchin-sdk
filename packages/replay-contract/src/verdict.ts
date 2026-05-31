// The replay verdict: the only shape we read out of an untrusted `run`.

/**
 * The output of a replay `run`, and the only thing we read from it. `passed`
 * drives the captcha decision; `score` and `durationMs` are carried in the
 * issued token (and a future scoreboard). The shape is OURS; everything else
 * about the run - the engine, the trace, the renderer - is the customer's.
 */
export interface Verdict {
  /** Captcha decision: `true` if the player cleared the game according to the engine's own pass logic. */
  readonly passed: boolean;
  /** Game-defined final score. Any finite number; not bounded by the platform. */
  readonly score: number;
  /** Engine-reported play duration in milliseconds. Must be finite and non-negative. */
  readonly durationMs: number;
}

/**
 * Validate an untrusted value as a {@link Verdict}. The `run` is customer
 * code, so its return value is untrusted: the replay host MUST funnel it
 * through here and treat a `null` result as a REJECTED round, never a passing
 * one. Returns a fresh, normalized Verdict (exactly the three fields) on
 * success, or `null` on any shape violation.
 *
 * @param value - The raw return value of a `run` invocation.
 * @returns A normalized {@link Verdict} on success, or `null` if the shape is
 *   invalid (missing field, wrong type, non-finite number, negative
 *   `durationMs`).
 */
export function parseVerdict(value: unknown): Verdict | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.passed !== 'boolean') return null;
  if (typeof raw.score !== 'number' || !Number.isFinite(raw.score)) return null;
  if (
    typeof raw.durationMs !== 'number' ||
    !Number.isFinite(raw.durationMs) ||
    raw.durationMs < 0
  ) {
    return null;
  }
  return { passed: raw.passed, score: raw.score, durationMs: raw.durationMs };
}
