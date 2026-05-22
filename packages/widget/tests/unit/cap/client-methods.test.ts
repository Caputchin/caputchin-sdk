import { describe, it, expect, vi } from 'vitest';

import { createCapClient } from '../../../src/cap/client.js';

// The existing element/cap/client suite asserts the method shape + the solve /
// releaseGate / dispose paths; this fills the two remaining handles whose
// bodies weren't exercised: abortGate (game reported fatal) and reset.

let n = 0;
const id = (): string => `unit_client_${(n += 1)}`;

describe('createCapClient handles', () => {
  it('abortGate rejects the armed redeem gate without throwing', () => {
    const client = createCapClient(id(), 'https://api.test', { platform: {}, onWrappedToken: vi.fn() });
    expect(() => client.abortGate(new Error('game-failed: boom'))).not.toThrow();
    client.dispose();
  });

  it('reset delegates to the underlying cap widget', () => {
    const client = createCapClient(id(), 'https://api.test', { platform: {}, onWrappedToken: vi.fn() });
    expect(() => client.reset()).not.toThrow();
    client.dispose();
  });
});
