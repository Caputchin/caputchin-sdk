import { assembleWrappedToken, type WrappedToken } from '../token.js';

export interface SessionContext {
  platform: Record<string, unknown>;
  onWrappedToken: (token: WrappedToken) => void;
}

interface GateEntry {
  promise: Promise<Record<string, unknown>>;
  resolve: (platform: Record<string, unknown>) => void;
  timer: ReturnType<typeof setTimeout>;
}

const redeemGates = new WeakMap<HTMLElement, GateEntry>();
const sessionContexts = new WeakMap<HTMLElement, SessionContext>();

const GATE_TIMEOUT_MS = 5 * 60 * 1000;

let _activeSolvingEl: HTMLElement | null = null;

export function setActiveSolvingEl(el: HTMLElement | null): void {
  _activeSolvingEl = el;
}

export function registerElement(el: HTMLElement, ctx: SessionContext): void {
  sessionContexts.set(el, ctx);
}

export function unregisterElement(el: HTMLElement): void {
  const gate = redeemGates.get(el);
  if (gate) {
    clearTimeout(gate.timer);
    redeemGates.delete(el);
  }
  sessionContexts.delete(el);
}

export function armRedeemGate(el: HTMLElement): void {
  const existing = redeemGates.get(el);
  if (existing) clearTimeout(existing.timer);

  let resolve!: (platform: Record<string, unknown>) => void;
  const promise = new Promise<Record<string, unknown>>((res) => { resolve = res; });
  const timer = setTimeout(() => {
    redeemGates.delete(el);
    resolve({});
  }, GATE_TIMEOUT_MS);
  redeemGates.set(el, { promise, resolve, timer });
}

export function releaseRedeemGate(el: HTMLElement, platform: Record<string, unknown>): void {
  const gate = redeemGates.get(el);
  if (!gate) return;
  clearTimeout(gate.timer);
  redeemGates.delete(el);
  gate.resolve(platform);
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

  window.CAP_CUSTOM_FETCH = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const urlStr = toUrlStr(input);
    const isChallenge = urlStr.endsWith('/challenge');
    const isRedeem = urlStr.endsWith('/redeem');

    if (!isChallenge && !isRedeem) return window.fetch(input, init);

    const apiHost = __CAPUTCHIN_API_HOST__;
    const el = _activeSolvingEl;
    const ctx = el ? sessionContexts.get(el) : undefined;
    const parsedBody = parseBody(init);
    const merged = new Headers(init?.headers);
    merged.set('content-type', 'application/json');
    const headers = Object.fromEntries(merged.entries());

    if (isChallenge) {
      const body = JSON.stringify(ctx?.platform ? { ...parsedBody, platform: ctx.platform } : parsedBody);
      return window.fetch(`${apiHost}/api/v1/verify/start`, { ...init, method: 'POST', body, headers });
    }

    let platform: Record<string, unknown> = {};
    if (el) {
      const gate = redeemGates.get(el);
      if (gate) platform = await gate.promise;
    }

    const response = await window.fetch(`${apiHost}/api/v1/verify/pass`, {
      ...init,
      method: 'POST',
      body: JSON.stringify({ ...parsedBody, platform }),
      headers,
    });

    if (ctx && response.ok) {
      // Await body parse synchronously before returning so solve() sees the token immediately.
      try {
        const data = await response.clone().json() as Record<string, unknown>;
        if (data && typeof data['token'] === 'string') {
          ctx.onWrappedToken(assembleWrappedToken({
            token: data['token'] as string,
            score: typeof data['score'] === 'number' ? data['score'] : null,
            durationMs: typeof data['durationMs'] === 'number' ? data['durationMs'] : null,
          }));
        }
      } catch {
        // Body parse failure — token will be absent; element.ts fires cap-redeem-failed.
      }
    }

    return response;
  };
}
