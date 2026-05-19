import { assembleWrappedToken, type WrappedToken } from '../token.js';

export interface SessionContext {
  platform: Record<string, unknown>;
  onWrappedToken: (token: WrappedToken) => void;
}

interface GateEntry {
  promise: Promise<Record<string, unknown>>;
  resolve: (platform: Record<string, unknown>) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

// All per-widget state is keyed by the widget's unique id. The id is encoded
// into the Cap library's apiEndpoint path so each fetch carries its own id.
// No mutable module-level "active widget" state — the URL is the identifier.
const sessionContexts = new Map<string, SessionContext>();
const sessionIds = new Map<string, string>();
const redeemGates = new Map<string, GateEntry>();

const GATE_TIMEOUT_MS = 5 * 60 * 1000;

/** URL sentinel prefix for widget-routed fetches. Never reaches the server. */
export const CPT_ROUTE_PREFIX = '__cpt';
const ROUTE_RE = /\/__cpt\/([^/]+)\/(challenge|redeem)$/;

export function registerSession(id: string, ctx: SessionContext): void {
  sessionContexts.set(id, ctx);
}

export function unregisterSession(id: string): void {
  const gate = redeemGates.get(id);
  if (gate) clearTimeout(gate.timer);
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
 * Abort the gate — the redeem fetch (already awaiting or arriving later)
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

  // Pure URL router. Stateless across calls — every widget's session lives
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
      // Stash sessionId for this widget so the redeem branch can forward it.
      if (startResponse.ok) {
        try {
          const data = await startResponse.clone().json() as { platform?: { sessionId?: unknown } };
          if (typeof data?.platform?.sessionId === 'string') {
            sessionIds.set(widgetId, data.platform.sessionId);
          }
        } catch {
          // body parse failure — sessionId won't propagate; pass will fire missing-session-id
        }
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
        const data = await response.clone().json() as Record<string, unknown>;
        if (data && typeof data['token'] === 'string') {
          // score/durationMs were sent in the request `platform` (from the
          // gate release payload); the server doesn't echo them. Read from
          // the local request payload so the customer's pass event detail
          // surfaces the values we just transmitted.
          const score = typeof platform['score'] === 'number' ? platform['score'] : null;
          const durationMs = typeof platform['durationMs'] === 'number' ? platform['durationMs'] : null;
          ctx.onWrappedToken(assembleWrappedToken({
            token: data['token'] as string,
            score,
            durationMs,
          }));
        }
      } catch {
        // Body parse failure — token will be absent; element.ts fires verification-failed.
      }
    }

    return response;
  };
}
