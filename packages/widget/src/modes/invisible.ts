import type { Presentation } from './index.js';

export function createInvisiblePresentation(): Presentation {
  return {
    mount(): void {},
    unmount(): void {},
    setState(_state): void {},
    onActivate(_handler): () => void {
      return () => {};
    },
  };
}
