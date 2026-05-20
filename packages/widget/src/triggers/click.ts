import type { TriggerStrategy, TriggerContext } from './index.js';

/**
 * Click trigger: defer verification until the user clicks the presentation's
 * clickable surface. Only valid with mode="simple" and mode="game"; modes
 * without a click surface coerce to "auto" upstream (in config inspection).
 */
export function createClickTrigger(): TriggerStrategy {
  let cleanup: (() => void) | null = null;
  let started = false;

  return {
    activate(ctx: TriggerContext): void {
      cleanup = ctx.presentation.onActivate(() => {
        if (started) return;
        started = true;
        ctx.runVerification().catch(() => {});
      });
    },
    deactivate(): void {
      cleanup?.();
      cleanup = null;
      started = false;
    },
    forceStart(ctx: TriggerContext): void {
      if (started) return;
      started = true;
      ctx.runVerification().catch(() => {});
    },
  };
}
