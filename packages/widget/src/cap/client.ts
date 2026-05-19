import Cap from '@cap.js/widget';
import {
  CPT_ROUTE_PREFIX,
  armRedeemGate,
  releaseRedeemGate,
  registerSession,
  unregisterSession,
  type SessionContext,
} from './custom-fetch.js';

export interface CapClient {
  solve(): Promise<void>;
  releaseGate(platform: Record<string, unknown>): void;
  reset(): void;
  dispose(): void;
}

/**
 * Create a Cap client bound to a unique widget id. The id is encoded into
 * Cap's apiEndpoint as a URL sentinel — every fetch the Cap library issues
 * carries the id in its path, so the custom-fetch router can attach the
 * correct session context without any shared mutable state. Multiple widgets
 * solve in parallel; no queue, no race.
 */
export function createCapClient(
  widgetId: string,
  apiHost: string,
  ctx: SessionContext
): CapClient {
  registerSession(widgetId, ctx);

  // Sentinel apiEndpoint — never reaches the server. Custom-fetch parses the
  // widget id from the URL path and rewrites to the real /api/v1/verify/start
  // and /api/v1/verify/pass endpoints.
  const cap = new Cap({ apiEndpoint: `${apiHost}/${CPT_ROUTE_PREFIX}/${widgetId}/` });

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

    reset(): void {
      cap.reset();
    },

    dispose(): void {
      unregisterSession(widgetId);
      cap.reset();
    },
  };
}
