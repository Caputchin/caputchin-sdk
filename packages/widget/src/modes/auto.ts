import type { ModeStrategy, VerificationContext } from './index.js';

export function createAutoMode(runVerification: () => Promise<void>): ModeStrategy {
  return {
    activate(_ctx: VerificationContext): void {
      runVerification().catch(() => {});
    },
    deactivate(): void {},
  };
}
