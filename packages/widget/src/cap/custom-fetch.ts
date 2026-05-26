import type { Seed } from '@caputchin/game-sdk';
import { assembleWrappedToken, type WrappedToken } from '../token.js';

export interface SessionContext {
  platform: Record<string, unknown>;
  onWrappedToken: (token: WrappedToken) => void;
}

// Shared gate timeout. Both the redeem gate and the seed gate use it as a
// defensive backstop: an awaited gate on the verify path must never wedge the
// widget forever, so every gate the kickoff/redeem awaits is guaranteed to
// settle within this window even if the thing it waits for never arrives.
const GATE_TIMEOUT_MS = 5 * 60 * 1000;

// Per-widget seed gate. /verify/start returns the per-round seed;
// `awaitSeed` lets the iframe-kickoff path wait for it (resolving to null on a
// start failure / missing seed so kickoff never deadlocks). Armed at session
// registration; settled in the challenge branch (success), via resolveSeedGate
// (cap solve failed before/without firing the challenge), on the timeout
// backstop (solve hung internally — neither threw nor challenged), or on
// unregister.
interface SeedGate {
  promise: Promise<Seed | null>;
  resolve: (seed: Seed | null) => void;
  timer: ReturnType<typeof setTimeout>;
}
const seedGates = new Map<string, SeedGate>();

function armSeedGate(id: string): void {
  let resolve!: (seed: Seed | null) => void;
  const promise = new Promise<Seed | null>((res) => { resolve = res; });
  // Backstop: a solve that neither fires the challenge nor throws (internal
  // hang) would otherwise leave a kickoff awaiting the seed forever. Mirrors
  // redeemGate's timeout; never fires on the normal success/failure paths
  // (both settle the gate first).
  const timer = setTimeout(() => settleSeedGate(id, null), GATE_TIMEOUT_MS);
  seedGates.set(id, { promise, resolve, timer });
}

/** Settle the seed gate once with `seed` (or null), clearing the backstop
 *  timer. Idempotent: the promise resolve is one-shot, so repeat calls (timeout
 *  after challenge, unregister after resolve) are harmless no-ops. */
function settleSeedGate(id: string, seed: Seed | null): void {
  const gate = seedGates.get(id);
  if (!gate) return;
  clearTimeout(gate.timer);
  gate.resolve(seed);
}

/** Resolve a still-pending seed gate to null. Called on the cap-solve failure
 *  path (solve threw before/without firing /verify/start) so a game-iframe
 *  kickoff awaiting the seed unblocks immediately rather than waiting out the
 *  timeout. No-op for an already-settled or unknown gate. */
export function resolveSeedGate(id: string): void {
  settleSeedGate(id, null);
}

/** Resolves with the per-round seed once /verify/start responds, or null if it
 *  failed / carried no seed (a gameless or no-verify session). Null for an
 *  unknown widget id. */
export function awaitSeed(id: string): Promise<Seed | null> {
  return seedGates.get(id)?.promise ?? Promise.resolve(null);
}

interface GateEntry {
  promise: Promise<Record<string, unknown>>;
  resolve: (platform: Record<string, unknown>) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

// All per-widget state is keyed by the widget's unique id. The id is encoded
// into the Cap library's apiEndpoint path so each fetch carries its own id.
// No mutable module-level "active widget" state; the URL is the identifier.
const sessionContexts = new Map<string, SessionContext>();
const sessionIds = new Map<string, string>();
const redeemGates = new Map<string, GateEntry>();

/** URL sentinel prefix for widget-routed fetches. Never reaches the server. */
export const CPT_ROUTE_PREFIX = '__cpt';
const ROUTE_RE = /\/__cpt\/([^/]+)\/(challenge|redeem)$/;

export function registerSession(id: string, ctx: SessionContext): void {
  sessionContexts.set(id, ctx);
  armSeedGate(id);
}

export function unregisterSession(id: string): void {
  const gate = redeemGates.get(id);
  if (gate) clearTimeout(gate.timer);
  // Settle any unresolved seed gate (null) + clear its backstop timer so a
  // pending awaitSeed doesn't hang and no stray timer survives the session.
  settleSeedGate(id, null);
  seedGates.delete(id);
  redeemGates.delete(id);
  sessionContexts.delete(id);
  sessionIds.delete(id);
}

/** Used by multi-round games to fire follow-up /verify/pass calls directly. */
export function getSessionId(id: string): string | null {
  return sessionIds.get(id) ?? null;
}

export function armRedeemGate(id: string): void {
  const existing = redeemGates.get(id);
  if (existing) clearTimeout(existing.timer);

  let resolve!: (platform: Record<string, unknown>) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<Record<string, unknown>>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // Swallow late rejections so unhandled-rejection noise doesn't surface
  // for gates whose redeem fetch never arrived (e.g. game aborted early).
  promise.catch(() => {});
  const timer = setTimeout(() => {
    redeemGates.delete(id);
    resolve({});
  }, GATE_TIMEOUT_MS);
  redeemGates.set(id, { promise, resolve, reject, timer });
}

export function releaseRedeemGate(id: string, platform: Record<string, unknown>): void {
  const gate = redeemGates.get(id);
  if (!gate) return;
  clearTimeout(gate.timer);
  // Keep the resolved gate in the map so a redeem fetch that fires AFTER the
  // release still finds it and awaits the already-resolved promise. Cleanup
  // happens in unregisterSession.
  gate.resolve(platform);
}

/**
 * Abort the gate; the redeem fetch (already awaiting or arriving later)
 * throws instead of fetching. Used when the game itself reported a fatal
 * error and verification must NOT continue.
 */
export function abortRedeemGate(id: string, reason: Error): void {
  const gate = redeemGates.get(id);
  if (!gate) return;
  clearTimeout(gate.timer);
  gate.reject(reason);
}

function parseBody(init: RequestInit | undefined): Record<string, unknown> {
  if (!init?.body || typeof init.body !== 'string') return {};
  try { return JSON.parse(init.body) as Record<string, unknown>; } catch { return {}; }
}

function toUrlStr(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return (input as Request).url;
}

let customFetchInstalled = false;

export function installCustomFetch(): void {
  if (customFetchInstalled) return;
  customFetchInstalled = true;

  // Pure URL router. Stateless across calls; every widget's session lives
  // in the per-id maps above and is looked up deterministically from the
  // path. 50 widgets calling concurrently route to 50 independent contexts.
  window.CAP_CUSTOM_FETCH = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const urlStr = toUrlStr(input);
    const match = urlStr.match(ROUTE_RE);
    if (!match) return window.fetch(input, init);

    const widgetId = match[1]!;
    const op = match[2] as 'challenge' | 'redeem';

    const apiHost = __CAPUTCHIN_API_HOST__;
    const ctx = sessionContexts.get(widgetId);
    const parsedBody = parseBody(init);
    const merged = new Headers(init?.headers);
    merged.set('content-type', 'application/json');
    const headers = Object.fromEntries(merged.entries());

    if (op === 'challenge') {
      const body = JSON.stringify(
        ctx?.platform ? { ...parsedBody, platform: ctx.platform } : parsedBody
      );
      const startResponse = await window.fetch(`${apiHost}/api/v1/verify/start`, {
        ...init,
        method: 'POST',
        body,
        headers,
      });
      // Stash sessionId for this widget so the redeem branch can forward it,
      // and resolve the seed gate so the iframe kickoff can run the game under
      // the per-round seed.
      if (startResponse.ok) {
        try {
          const data = await startResponse.clone().json() as {
            platform?: { sessionId?: unknown; seed?: unknown };
          };
          if (typeof data?.platform?.sessionId === 'string') {
            sessionIds.set(widgetId, data.platform.sessionId);
          }
          const seed = data?.platform?.seed;
          const validSeed =
            Array.isArray(seed) && seed.length === 4 && seed.every((n) => typeof n === 'number');
          // Opaque to the widget: shuttle the validated 4-number seed to the
          // iframe kickoff (cast through unknown after the runtime shape check).
          settleSeedGate(widgetId, validSeed ? (seed as unknown as Seed) : null);
        } catch {
          // body parse failure; sessionId won't propagate (pass fires
          // missing-session-id); settle the seed gate null so kickoff proceeds.
          settleSeedGate(widgetId, null);
        }
      } else {
        settleSeedGate(widgetId, null);
      }
      return startResponse;
    }

    // op === 'redeem'
    let platform: Record<string, unknown> = {};
    const gate = redeemGates.get(widgetId);
    if (gate) platform = await gate.promise;
    const sessionId = sessionIds.get(widgetId);
    if (sessionId) platform = { ...platform, sessionId };

    const response = await window.fetch(`${apiHost}/api/v1/verify/pass`, {
      ...init,
      method: 'POST',
      body: JSON.stringify({ ...parsedBody, platform }),
      headers,
    });

    if (ctx && response.ok) {
      try {
        // The wrapped token the customer submits (to /siteverify or the HV
        // forwarder) is the platform's base64url envelope at
        // `platform.wrappedToken` — NOT the top-level `token`, which is Cap's
        // own redeem token spread from the cap response. Reading `token` here
        // injects an unverifiable value (unpack-failed downstream). Contract:
        // GameCompleteRedeemed in @caputchin/api-schemas (verify/pass route).
        const data = await response.clone().json() as { platform?: { wrappedToken?: unknown } };
        const wrapped = data?.platform?.wrappedToken;
        if (typeof wrapped === 'string') {
          // The widget surfaces pass/fail only: the authoritative score/durationMs
          // are the server replay's, read by the customer's backend at /siteverify
          // — not relayed through the client pass event.
          ctx.onWrappedToken(assembleWrappedToken({ token: wrapped }));
        }
      } catch {
        // Body parse failure; token will be absent; element.ts fires verification-failed.
      }
    }

    return response;
  };
}
