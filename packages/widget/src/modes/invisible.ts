import type { Presentation } from './index.js';

export function createInvisiblePresentation(): Presentation {
  return {
    mount(): void {},
    unmount(): void {},
    setState(_state): void {},
    onActivate(_handler): () => void {
      return () => {};
    },
    // No DOM, so skin/locale swaps are no-ops (verification still runs headless).
    applySkin(_skin): void {},
    applyLocale(_shell): void {},
  };
}
