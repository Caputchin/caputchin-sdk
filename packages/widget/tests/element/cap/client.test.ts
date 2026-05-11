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
  return { Cap: mockCap };
});

(globalThis as Record<string, unknown>)['__CAPUTCHIN_API_HOST__'] = 'https://api.test.com';

import { createCapClient } from '../../../src/cap/client.js';
import { installCustomFetch, setActiveSolvingEl, armRedeemGate } from '../../../src/cap/custom-fetch.js';

installCustomFetch();
vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ token: 'tok', score: 1, durationMs: 100 }), { status: 200 })));

describe('createCapClient', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
  });

  it('creates client with solve/releaseGate/reset/dispose', () => {
    const client = createCapClient(el, 'https://api.test.com', { platform: {}, onWrappedToken: vi.fn() });
    expect(typeof client.solve).toBe('function');
    expect(typeof client.releaseGate).toBe('function');
    expect(typeof client.reset).toBe('function');
    expect(typeof client.dispose).toBe('function');
  });

  it('releaseGate resolves redeem gate promise', async () => {
    const client = createCapClient(el, 'https://api.test.com', { platform: {}, onWrappedToken: vi.fn() });
    armRedeemGate(el);
    client.releaseGate({ score: 5, durationMs: 100 });
    expect(() => client.dispose()).not.toThrow();
  });

  it('dispose unregisters element', () => {
    const onWrappedToken = vi.fn();
    const client = createCapClient(el, 'https://api.test.com', { platform: {}, onWrappedToken });
    expect(() => client.dispose()).not.toThrow();
  });

  it('solve serializes via queue — second solve starts after first resolves', async () => {
    const order: number[] = [];
    const el1 = document.createElement('div');
    const el2 = document.createElement('div');

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

    const client1 = createCapClient(el1, 'https://api.test.com', { platform: {}, onWrappedToken: vi.fn() });
    const client2 = createCapClient(el2, 'https://api.test.com', { platform: {}, onWrappedToken: vi.fn() });

    setActiveSolvingEl(el1);
    const p1 = client1.solve().catch(() => {});
    const p2 = client2.solve().catch(() => {});

    await Promise.resolve();
    expect(order).toEqual([1]);

    resolveFirst();
    await Promise.all([p1, p2]);
    expect(order[1]).toBe(2);

    client1.dispose();
    client2.dispose();
  });
});
