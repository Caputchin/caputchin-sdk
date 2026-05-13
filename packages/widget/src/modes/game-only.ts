import type { ModeStrategy, VerificationContext } from './index.js';

export function createGameOnlyMode(runGame: () => Promise<void>): ModeStrategy {
  return {
    activate(_ctx: VerificationContext): void {
      runGame().catch(() => {});
    },
    deactivate(): void {},
  };
}
