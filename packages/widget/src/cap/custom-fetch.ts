import type { WrappedToken } from '../token.js';

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

  const originalFetch = window.fetch.bind(window);

  window.CAP_CUSTOM_FETCH = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const urlStr = toUrlStr(input);
    const isChallenge = urlStr.endsWith('/challenge');
    const isRedeem = urlStr.endsWith('/redeem');

    if (!isChallenge && !isRedeem) return originalFetch(input, init);

    const apiHost = __CAPUTCHIN_API_HOST__;
    const el = _activeSolvingEl;
    const ctx = el ? sessionContexts.get(el) : undefined;
    const parsedBody = parseBody(init);
    const headers = { 'Content-Type': 'application/json', ...((init?.headers as Record<string, string>) ?? {}) };

    if (isChallenge) {
      const body = JSON.stringify(ctx?.platform ? { ...parsedBody, platform: ctx.platform } : parsedBody);
      return originalFetch(`${apiHost}/api/v1/game/start`, { ...init, method: 'POST', body, headers });
    }

    let platform: Record<string, unknown> = {};
    if (el) {
      const gate = redeemGates.get(el);
      if (gate) platform = await gate.promise;
    }

    const response = await originalFetch(`${apiHost}/api/v1/game/complete`, {
      ...init,
      method: 'POST',
      body: JSON.stringify({ ...parsedBody, platform }),
      headers,
    });

    if (ctx && response.ok) {
      response.clone().json().then((data: unknown) => {
        const d = data as Record<string, unknown>;
        if (d && typeof d['token'] === 'string') {
          ctx.onWrappedToken({
            token: d['token'],
            score: typeof d['score'] === 'number' ? d['score'] : null,
            durationMs: typeof d['durationMs'] === 'number' ? d['durationMs'] : null,
          });
        }
      }).catch(() => {});
    }

    return response;
  };
}
