import type { ModeStrategy, VerificationContext } from './index.js';

export function createManualMode(
  el: HTMLElement,
  runVerification: () => Promise<void>
): ModeStrategy {
  let started = false;

  return {
    activate(ctx: VerificationContext): void {
      Object.defineProperty(el, 'start', {
        value(): void {
          if (started) return;
          started = true;
          runVerification().catch(() => {});
        },
        configurable: true,
        writable: false,
        enumerable: false,
      });

      Object.defineProperty(el, 'complete', {
        value(payload: { score: number | null; durationMs: number | null }): void {
          ctx.capClient?.releaseGate({ score: payload.score, durationMs: payload.durationMs });
        },
        configurable: true,
        writable: false,
        enumerable: false,
      });

      Object.defineProperty(el, 'setNickname', {
        value(_letters: string): void {},
        configurable: true,
        writable: false,
        enumerable: false,
      });
    },

    deactivate(): void {
      const elAny = el as unknown as Record<string, unknown>;
      try { delete elAny['start']; } catch {}
      try { delete elAny['complete']; } catch {}
      try { delete elAny['setNickname']; } catch {}
      started = false;
    },
  };
}
