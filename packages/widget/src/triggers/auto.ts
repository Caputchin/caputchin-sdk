import type { TriggerStrategy, TriggerContext } from './index.js';

export function createAutoTrigger(): TriggerStrategy {
  let started = false;

  function start(ctx: TriggerContext): void {
    if (started) return;
    started = true;
    ctx.runVerification().catch(() => {});
  }

  return {
    activate(ctx: TriggerContext): void {
      start(ctx);
    },
    deactivate(): void {
      started = false;
    },
    forceStart(ctx: TriggerContext): void {
      start(ctx);
    },
  };
}
