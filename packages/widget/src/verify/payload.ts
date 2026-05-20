/** Customer-supplied payload for `<caputchin-game>` manual mode methods. */
export interface ManualPassPayload {
  score?: number | null;
  durationMs?: number | null;
}

/** Customer-supplied payload for `<caputchin-game>` manual mode `fail()`. */
export interface ManualFailPayload {
  code?: string;
  message?: string;
}

/** Normalize an optional number coming from a customer-passed object literal.
 *  Anything that isn't a finite number coerces to `null`. */
export function normalizeOptionalNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' ? value : null;
}
