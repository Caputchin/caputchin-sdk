/**
 * @module shim
 *
 * Neutralization shim for the IEEE-754 + JS engine path. Apply once at the
 * top of the engine's execution scope via {@link applyShim} to make the
 * environment determinism-safe for both live play and server replay.
 */

// The neutralization shim - an OPTIONAL helper for the IEEE-754 + JS path.
// Run once at the top of the engine's execution scope; applying the
// SAME shim live and on replay keeps those two environments from drifting via a
// stray non-deterministic global. It is optional: a fixed-point or WASM author
// never needs it, and a bare conforming `run` may skip it entirely.
//
// It does two things:
//   1. Swaps `Math.*` transcendentals to point at `cap.math`, so even engine
//      code that calls `Math.sin` (rather than importing cap.math) is
//      deterministic. The IEEE-mandated members (`sqrt`/`abs`/`floor`/…) are
//      left alone - they are already bit-identical.
//   2. Replaces every non-deterministic global (`Date`, `Math.random`,
//      `crypto`, `fetch`, timers, GC observers, …) with a loud thrower, so any
//      accidental use fails immediately and visibly instead of silently making
//      a run un-replayable.
//
// The banned-surface list is NOT hand-maintained here: it is `BAN_ALL_SURFACES`
// from the canonical registry (./ambient), the same source the replay self-check
// prober projects its (narrower, WASM-safe) probe set from - so the two can
// never drift.
//
// This is a runtime safety net, not the trust anchor: determinism is the
// author's burden, the optional self-check tool catches drift before publish,
// and the server's per-verify replay is authoritative. The shim makes the
// failure mode "throws on first use" rather than "passes locally, diverges on
// the server".

import { BAN_ALL_SURFACES, bannedProxy } from './ambient';
import { resolveMathScope, swapMathInto } from './env';

type AnyRecord = Record<string, unknown>;

/** A thrower installed in place of a banned global. */
function banned(name: string): never {
  throw new Error(
    `${name} is not available inside a Caputchin engine: it is non-deterministic. ` +
      `Use cap.rng for randomness, logical ticks for time, and cap.math for transcendentals.`,
  );
}

/**
 * Apply the deterministic environment to the current global scope. Idempotent;
 * call once before importing/running the engine. Returns the list of names it
 * neutralized (for diagnostics/tests).
 */
export function applyShim(scope: object = globalThis): string[] {
  const g = scope as AnyRecord;
  const neutralized: string[] = [];

  // 1. Resolve the scope's Math ONCE, then both swap the transcendentals →
  //    cap.math (leaving sqrt/abs/floor/… intact) and ban Math.random on that
  //    same object. Math.random is the one Math member banned outright rather
  //    than swapped.
  const math = resolveMathScope(scope);
  swapMathInto(math);
  try {
    math['random'] = bannedProxy(() => banned('Math.random'));
  } catch {
    /* best effort */
  }

  // 2. neutralize non-deterministic globals (the full registry; the JS lane
  //    controls all its own code and uses none of them).
  for (const name of BAN_ALL_SURFACES) {
    try {
      g[name] = bannedProxy(() => banned(name));
      neutralized.push(name);
    } catch {
      // non-configurable global on this host - best effort
    }
  }

  return neutralized;
}
