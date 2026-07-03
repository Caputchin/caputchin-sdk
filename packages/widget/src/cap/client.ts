import Cap from '@cap.js/widget';
import {
  CPT_ROUTE_PREFIX,
  abortRedeemGate,
  armRedeemGate,
  releaseRedeemGate,
  registerSession,
  unregisterSession,
  type SessionContext,
} from './custom-fetch.js';

export interface CapClient {
  solve(): Promise<void>;
  releaseGate(platform: Record<string, unknown>): void;
  /** Abort the in-flight solve (used when the game itself reported a fatal error). */
  abortGate(reason: Error): void;
  reset(): void;
  dispose(): void;
}

/**
 * Create a Cap client bound to a unique widget id. The id is encoded into
 * Cap's apiEndpoint as a URL sentinel; every fetch the Cap library issues
 * carries the id in its path, so the custom-fetch router can attach the
 * correct session context without any shared mutable state. Multiple widgets
 * solve in parallel; no queue, no race.
 */
export function createCapClient(
  widgetId: string,
  apiHost: string,
  ctx: SessionContext
): CapClient {
  // Track the reuse short-circuit locally: /verify/start's cleared branch
  // deliberately hands cap.js a challenge it can't solve so its solve() fails
  // fast (see custom-fetch.ts) - that failure is EXPECTED here, not a real
  // error. Wrap ctx.onCleared (fired from the same challenge branch) so the
  // error override below can tell the two cases apart. Same object reference
  // custom-fetch.ts holds in its session map, so the wrap is visible to it.
  let cleared = false;
  const onSessionCleared = ctx.onCleared;
  ctx.onCleared = () => {
    cleared = true;
    onSessionCleared();
  };

  registerSession(widgetId, ctx);

  // Sentinel apiEndpoint; never reaches the server. Custom-fetch parses the
  // widget id from the URL path and rewrites to the real /v1/verify/start
  // and /v1/verify/pass endpoints.
  const cap = new Cap({ apiEndpoint: `${apiHost}/${CPT_ROUTE_PREFIX}/${widgetId}/` });

  // Silence cap.js's `console.error("[cap]", ...)` for:
  //   1. In-flight solves that fail AFTER the host widget was disposed. Once
  //      dispose() removes the cap-widget from DOM it's no longer connected,
  //      and surfacing those messages is pure noise (the host widget the
  //      user could see is gone).
  //   2. A reuse short-circuit's expected solve() failure - the platform
  //      already handed back a valid token via onWrappedToken, so this is a
  //      SUCCESS path; logging it as a console error would paint a working
  //      reuse hit as a failure to integrators (or their console monitors).
  // Override per-instance so other cap-widgets keep their normal reporting.
  const widgetForOverride = (cap as unknown as { widget?: HTMLElement & { error?: (msg: string) => void } }).widget;
  if (widgetForOverride?.error) {
    const originalError = widgetForOverride.error.bind(widgetForOverride);
    widgetForOverride.error = function (message: string): void {
      if (!widgetForOverride.isConnected) return;
      if (cleared) return;
      originalError(message);
    };
  }

  armRedeemGate(widgetId);

  return {
    async solve(): Promise<void> {
      const result = await cap.solve();
      if (!result) throw new Error('Cap solve returned no result');
      if (!result.success) throw new Error('Cap solve failed');
    },

    releaseGate(platform: Record<string, unknown>): void {
      releaseRedeemGate(widgetId, platform);
    },

    abortGate(reason: Error): void {
      abortRedeemGate(widgetId, reason);
    },

    reset(): void {
      cap.reset();
    },

    dispose(): void {
      unregisterSession(widgetId);
      cap.reset();
      // Remove the cap-widget element from <html>. `new Cap()` appends it to
      // document.documentElement; cap.reset() does NOT remove it. Without this,
      // each remount of the host element (e.g. React effect re-run debounced
      // behind a sibling fetch) accumulates cap-widget elements under <html>,
      // each with its own window-level interaction listeners that keep firing
      // speculative /verify/start + /verify/pass calls under their (now
      // unregistered) widget id. Removing the element triggers its own
      // disconnectedCallback which detaches those listeners + clears state.
      const widgetEl = (cap as unknown as { widget?: HTMLElement }).widget;
      if (widgetEl?.parentNode) widgetEl.parentNode.removeChild(widgetEl);
    },
  };
}
