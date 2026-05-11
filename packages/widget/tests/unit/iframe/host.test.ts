import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as channelMod from '../../../src/protocol/channel.js';
import { IframeHost } from '../../../src/iframe/host.js';

(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME__'] = '';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME_SHA256__'] = 'sha256abc';

describe('IframeHost', () => {
  let listenSpy: ReturnType<typeof vi.spyOn>;
  let sendSpy: ReturnType<typeof vi.spyOn>;
  let capturedListener: ((msg: unknown) => void) | null = null;

  beforeEach(() => {
    capturedListener = null;
    listenSpy = vi.spyOn(channelMod, 'listen').mockImplementation((_iframe, _el, cb) => {
      capturedListener = cb as (msg: unknown) => void;
      return () => {};
    });
    sendSpy = vi.spyOn(channelMod, 'send').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    listenSpy.mockRestore();
    sendSpy.mockRestore();
  });

  const makeHost = (gameUrl: string | null = null) =>
    new IframeHost(gameUrl, null, 'g1', document.createElement('div'), vi.fn());

  const mountHost = (host: IframeHost, onLoadFailed = vi.fn(), onGameStarted?: () => void) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    host.mount(container, onLoadFailed, onGameStarted);
    return container;
  };

  it('onGameStarted fires when game-started postMessage arrives (M3)', () => {
    const onGameStarted = vi.fn();
    const host = makeHost();
    const container = mountHost(host, vi.fn(), onGameStarted);

    capturedListener?.({ kind: 'game-started', seq: 1 });
    expect(onGameStarted).toHaveBeenCalledOnce();

    host.dispose();
    container.remove();
  });

  it('onGameStarted not fired for game-complete', () => {
    const onGameStarted = vi.fn();
    const host = makeHost();
    const container = mountHost(host, vi.fn(), onGameStarted);

    capturedListener?.({ kind: 'game-complete', seq: 2, score: null, durationMs: null });
    expect(onGameStarted).not.toHaveBeenCalled();

    host.dispose();
    container.remove();
  });

  it('kickoff-ack timer fires iframe-load-failed after 10s (F5)', () => {
    const onLoadFailed = vi.fn();
    const host = makeHost();
    const container = mountHost(host, onLoadFailed);

    host.kickoff(1, 'sk', 'https://api.test.com');
    expect(onLoadFailed).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10_001);
    expect(onLoadFailed).toHaveBeenCalledOnce();
    expect(onLoadFailed.mock.calls[0]![0]).toBe('iframe-load-failed');

    container.remove();
  });

  it('kickoff-ack timer cleared when game-started arrives', () => {
    const onLoadFailed = vi.fn();
    const host = makeHost();
    const container = mountHost(host, onLoadFailed);

    host.kickoff(1, 'sk', 'https://api.test.com');
    capturedListener?.({ kind: 'game-started', seq: 1 });
    vi.advanceTimersByTime(15_000);

    expect(onLoadFailed).not.toHaveBeenCalled();

    host.dispose();
    container.remove();
  });

  it('dispose sends dispose message and removes iframe', () => {
    const host = makeHost();
    const container = mountHost(host);

    host.kickoff(1, 'sk', 'https://api.test.com');
    host.dispose();

    expect(sendSpy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kind: 'dispose' }));
    container.remove();
  });

  it('dispose clears kickoff-ack timer — no load-failed after dispose', () => {
    const onLoadFailed = vi.fn();
    const host = makeHost();
    const container = mountHost(host, onLoadFailed);

    host.kickoff(1, 'sk', 'https://api.test.com');
    host.dispose();
    vi.advanceTimersByTime(15_000);

    expect(onLoadFailed).not.toHaveBeenCalled();
    container.remove();
  });

  it('build returns an iframe with sandbox allow-scripts', () => {
    const host = makeHost();
    const iframe = host.build();
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
  });

  it('mount auto-builds iframe if not already built', () => {
    const host = makeHost();
    const container = document.createElement('div');
    document.body.appendChild(container);
    host.mount(container, vi.fn());
    expect(container.querySelector('iframe')).not.toBeNull();
    host.dispose();
    container.remove();
  });
});
