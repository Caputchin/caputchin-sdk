import type { TriggerStrategy, TriggerContext } from './index.js';

/**
 * Manual trigger: customer drives the lifecycle. `widget.start()` begins
 * verification; for `mode="game"` only, `widget.pass({score, durationMs})`
 * releases the Cap gate with the game payload. For other modes, `pass()`
 * is not applicable and is noop+error at the element level.
 */
export function createManualTrigger(): TriggerStrategy {
  let started = false;
  let savedCtx: TriggerContext | null = null;

  function start(ctx: TriggerContext): void {
    if (started) return;
    started = true;
    ctx.runVerification().catch(() => {});
  }

  return {
    activate(ctx: TriggerContext): void {
      savedCtx = ctx;
    },
    deactivate(): void {
      started = false;
      savedCtx = null;
    },
    forceStart(_ctx: TriggerContext): void {
      if (savedCtx) start(savedCtx);
    },
  };
}
