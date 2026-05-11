import { Cap } from '@cap.js/widget';
import {
  armRedeemGate,
  releaseRedeemGate,
  registerElement,
  unregisterElement,
  setActiveSolvingEl,
  type SessionContext,
} from './custom-fetch.js';

export interface CapClient {
  solve(): Promise<void>;
  releaseGate(platform: Record<string, unknown>): void;
  reset(): void;
  dispose(): void;
}

// Module-level serial queue so concurrent widget.solve() calls never race on _activeSolvingEl.
// Each solve occupies the slot for its full duration (challenge + PoW + redeem).
let solveQueue: Promise<void> = Promise.resolve();

export function createCapClient(
  el: HTMLElement,
  apiHost: string,
  ctx: SessionContext
): CapClient {
  registerElement(el, ctx);

  const cap = new Cap({ apiEndpoint: `${apiHost}/api/v1/game/` });

  // arm the gate immediately so Cap's redeem call waits for game-complete
  armRedeemGate(el);

  return {
    solve(): Promise<void> {
      // Chain onto the global queue so only one element's Cap solve runs at a time.
      const entry = solveQueue.then(async () => {
        setActiveSolvingEl(el);
        try {
          const result = await cap.solve();
          if (!result) {
            throw new Error('Cap solve returned no result');
          }
          if (!result.success) {
            throw new Error('Cap solve failed');
          }
        } finally {
          setActiveSolvingEl(null);
        }
      });
      // Advance the queue without propagating rejections to subsequent slots.
      solveQueue = entry.catch(() => {});
      return entry;
    },

    releaseGate(platform: Record<string, unknown>): void {
      releaseRedeemGate(el, platform);
    },

    reset(): void {
      cap.reset();
    },

    dispose(): void {
      unregisterElement(el);
      cap.reset();
    },
  };
}
