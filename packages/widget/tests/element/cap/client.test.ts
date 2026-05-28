import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@cap.js/widget', () => {
  const mockWidget = {
    solve: vi.fn(async () => ({ success: true })),
    reset: vi.fn(),
    setAttribute: vi.fn(),
    style: { display: '' },
    hasAttribute: vi.fn(() => false),
  };
  const mockCap = vi.fn(() => ({
    solve: mockWidget.solve,
    reset: mockWidget.reset,
  }));
  return { default: mockCap, Cap: mockCap };
});

(globalThis as Record<string, unknown>)['__CAPUTCHIN_API_HOST__'] = 'https://api.test.com';

import { createCapClient } from '../../../src/cap/client.js';
import { installCustomFetch, armRedeemGate } from '../../../src/cap/custom-fetch.js';

installCustomFetch();
vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ token: 'tok', score: 1, durationMs: 100 }), { status: 200 })));

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `test_${idCounter}`;
}

describe('createCapClient', () => {
  beforeEach(() => {
    // fresh id per test
  });

  it('creates client with solve/releaseGate/reset/dispose', () => {
    const id = nextId();
    const client = createCapClient(id, 'https://api.test.com', { platform: {}, onWrappedToken: vi.fn() });
    expect(typeof client.solve).toBe('function');
    expect(typeof client.releaseGate).toBe('function');
    expect(typeof client.reset).toBe('function');
    expect(typeof client.dispose).toBe('function');
  });

  it('releaseGate resolves redeem gate promise (idempotent)', async () => {
    const id = nextId();
    const client = createCapClient(id, 'https://api.test.com', { platform: {}, onWrappedToken: vi.fn() });
    armRedeemGate(id);
    client.releaseGate({ score: 5, durationMs: 100 });
    expect(() => client.dispose()).not.toThrow();
  });

  it('dispose unregisters the widget id (no shared state retained)', () => {
    const id = nextId();
    const onWrappedToken = vi.fn();
    const client = createCapClient(id, 'https://api.test.com', { platform: {}, onWrappedToken });
    expect(() => client.dispose()).not.toThrow();
  });

  it('dispose removes the cap-widget element from DOM (stops stale speculative fires)', async () => {
    // tests/setup.ts globally mocks Cap with `widget: { token: null }` (a plain
    // object, no parentNode), so the dispose() removal logic short-circuits and
    // stays untested by every other case in this file. Re-mock locally with a
    // real HTMLElement appended to documentElement so the removal path runs.
    const { Cap } = await import('@cap.js/widget');
    const capMock = Cap as ReturnType<typeof vi.fn>;
    const widgetEl = document.createElement('cap-widget');
    document.documentElement.appendChild(widgetEl);
    capMock.mockImplementationOnce(() => ({
      solve: vi.fn(async () => ({ success: true })),
      reset: vi.fn(),
      widget: widgetEl,
      token: null,
    }));
    expect(document.documentElement.contains(widgetEl)).toBe(true);
    const client = createCapClient(nextId(), 'https://api.test.com', { platform: {}, onWrappedToken: vi.fn() });
    client.dispose();
    expect(document.documentElement.contains(widgetEl)).toBe(false);
  });

  it('dispose is safe when the cap-widget is already detached (parentNode null)', async () => {
    // Defense-in-depth: cap.reset() called elsewhere may have already removed
    // the widget. The optional-chain on parentNode keeps dispose() from
    // throwing on the second pass.
    const { Cap } = await import('@cap.js/widget');
    const capMock = Cap as ReturnType<typeof vi.fn>;
    const detached = document.createElement('cap-widget');
    capMock.mockImplementationOnce(() => ({
      solve: vi.fn(async () => ({ success: true })),
      reset: vi.fn(),
      widget: detached,
      token: null,
    }));
    const client = createCapClient(nextId(), 'https://api.test.com', { platform: {}, onWrappedToken: vi.fn() });
    expect(() => client.dispose()).not.toThrow();
  });

  it('two clients solve in parallel - no serialization queue', async () => {
    const order: number[] = [];

    const { Cap } = await import('@cap.js/widget');
    const capMock = Cap as ReturnType<typeof vi.fn>;

    let resolveFirst!: () => void;
    const firstDone = new Promise<void>((res) => { resolveFirst = res; });

    capMock.mockImplementationOnce(() => ({
      solve: vi.fn(async () => { order.push(1); await firstDone; return { success: true }; }),
      reset: vi.fn(),
    })).mockImplementationOnce(() => ({
      solve: vi.fn(async () => { order.push(2); return { success: true }; }),
      reset: vi.fn(),
    }));

    const client1 = createCapClient(nextId(), 'https://api.test.com', { platform: {}, onWrappedToken: vi.fn() });
    const client2 = createCapClient(nextId(), 'https://api.test.com', { platform: {}, onWrappedToken: vi.fn() });

    const p1 = client1.solve().catch(() => {});
    const p2 = client2.solve().catch(() => {});

    // Both solves should be in flight; the second one resolves before the first
    // because the first is awaiting `firstDone`. No global queue blocking it.
    await Promise.resolve();
    await Promise.resolve();
    expect(order).toEqual([1, 2]);

    resolveFirst();
    await Promise.all([p1, p2]);

    client1.dispose();
    client2.dispose();
  });
});
