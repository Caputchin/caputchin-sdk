import { vi } from 'vitest';

// Global mock for @cap.js/widget so element / lifecycle tests don't construct
// the real Cap class (which appends a cap-widget element to documentElement
// and triggers happy-dom recursion). Tests that need to drive cap behavior
// re-mock locally.
vi.mock('@cap.js/widget', () => {
  const mockSolve = vi.fn(async () => ({ success: true }));
  const mockCap = vi.fn(function () {
    return {
      solve: mockSolve,
      reset: vi.fn(),
      widget: { token: null },
      token: null,
    };
  });
  return { default: mockCap, Cap: mockCap };
});
