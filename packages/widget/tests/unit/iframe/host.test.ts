import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as channelMod from '../../../src/protocol/channel.js';
import { IframeHost } from '../../../src/iframe/host.js';

(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME__'] = '';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME_SHA256__'] = 'sha256abc';

describe('IframeHost', () => {
  let listenSpy: ReturnType<typeof vi.spyOn>;
  let capturedListener: ((msg: { kind: string; seq: number }) => void) | null = null;

  beforeEach(() => {
    capturedListener = null;
    listenSpy = vi.spyOn(channelMod, 'listen').mockImplementation((_iframe, _el, cb) => {
      capturedListener = cb as (msg: { kind: string; seq: number }) => void;
      return () => {};
    });
    vi.spyOn(channelMod, 'send').mockImplementation(() => {});
  });

  it('onGameStarted fires when game-started postMessage arrives (M3)', () => {
    const host = new IframeHost(null, null, 'g1', document.createElement('div'), vi.fn());
    const container = document.createElement('div');
    document.body.appendChild(container);

    const onGameStarted = vi.fn();
    host.mount(container, vi.fn(), onGameStarted);

    expect(onGameStarted).not.toHaveBeenCalled();
    capturedListener?.({ kind: 'game-started', seq: 1 });
    expect(onGameStarted).toHaveBeenCalledOnce();

    container.remove();
    listenSpy.mockRestore();
  });

  it('onGameStarted not fired for game-complete', () => {
    const host = new IframeHost(null, null, 'g1', document.createElement('div'), vi.fn());
    const container = document.createElement('div');
    document.body.appendChild(container);

    const onGameStarted = vi.fn();
    host.mount(container, vi.fn(), onGameStarted);

    capturedListener?.({ kind: 'game-complete', seq: 2 } as { kind: string; seq: number });
    expect(onGameStarted).not.toHaveBeenCalled();

    container.remove();
    listenSpy.mockRestore();
  });
});
