/** Customer-supplied payload for `<caputchin-game>` manual mode `pass()`.
 *  The customer-hosted game hands its opaque TRACE (ADR-0069); the server
 *  replays it for the verdict. (No score — the gate is the server replay.) */
export interface ManualPassPayload {
  trace: string;
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
