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

  it('onGameStarted not fired for game-pass', () => {
    const onGameStarted = vi.fn();
    const host = makeHost();
    const container = mountHost(host, vi.fn(), onGameStarted);

    capturedListener?.({ kind: 'game-pass', seq: 2, score: null, durationMs: null });
    expect(onGameStarted).not.toHaveBeenCalled();

    host.dispose();
    container.remove();
  });

  it('kickoff-ack timer fires iframe-load-failed after 10s (F5)', () => {
    const onLoadFailed = vi.fn();
    const host = makeHost();
    const container = mountHost(host, onLoadFailed);

    host.kickoff(1);
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

    host.kickoff(1);
    capturedListener?.({ kind: 'game-started', seq: 1 });
    vi.advanceTimersByTime(15_000);

    expect(onLoadFailed).not.toHaveBeenCalled();

    host.dispose();
    container.remove();
  });

  it('dispose sends dispose message and removes iframe', () => {
    const host = makeHost();
    const container = mountHost(host);

    host.kickoff(1);
    host.dispose();

    expect(sendSpy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kind: 'dispose' }));
    container.remove();
  });

  it('dispose clears kickoff-ack timer - no load-failed after dispose', () => {
    const onLoadFailed = vi.fn();
    const host = makeHost();
    const container = mountHost(host, onLoadFailed);

    host.kickoff(1);
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

  it('getIframe returns the iframe after build', () => {
    const host = makeHost();
    host.build();
    expect(host.getIframe()).not.toBeNull();
    expect(host.getIframe()?.tagName).toBe('IFRAME');
  });

  it('manifest msg is intercepted - not forwarded to onMessage', () => {
    const onMessage = vi.fn();
    const host = new IframeHost(null, null, 'g1', document.createElement('div'), onMessage);
    mountHost(host);

    capturedListener?.({ kind: 'manifest', seq: 0, gameId: 'g1', preferredLayout: 'modal', preferredWidth: null, preferredHeight: null, locales: null });
    expect(onMessage).not.toHaveBeenCalled();

    host.dispose();
  });

  it('waitManifest resolves when manifest arrives', async () => {
    const host = makeHost();
    mountHost(host);

    const promise = host.waitManifest(5_000);
    capturedListener?.({ kind: 'manifest', seq: 0, gameId: 'g1', preferredLayout: 'modal', preferredWidth: null, preferredHeight: null, locales: null });
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).not.toBeNull();
    expect(result?.preferredLayout).toBe('modal');

    host.dispose();
  });

  it('waitManifest uses buffered manifest if it arrived before the await', async () => {
    const host = makeHost();
    mountHost(host);

    capturedListener?.({ kind: 'manifest', seq: 0, gameId: 'g1', preferredLayout: 'fullscreen', preferredWidth: null, preferredHeight: null, locales: null });
    const result = await host.waitManifest(5_000);
    expect(result?.preferredLayout).toBe('fullscreen');

    host.dispose();
  });

  it('waitManifest resolves null after timeout when no manifest arrives', async () => {
    const host = makeHost();
    mountHost(host);

    const promise = host.waitManifest(2_000);
    vi.advanceTimersByTime(2_001);
    const result = await promise;
    expect(result).toBeNull();

    host.dispose();
  });

  it('kickoff(seq) defaults lang to null in the outbound message', () => {
    const host = makeHost();
    mountHost(host);

    host.kickoff(1);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kind: 'kickoff', seq: 1, gameId: 'g1', locale: null }),
    );

    host.dispose();
  });

  it('kickoff(seq, lang) forwards the resolved language payload', () => {
    const host = makeHost();
    mountHost(host);

    const lang = { _direction: 'rtl' as const, _lang: 'ar', hello: 'مرحبا' };
    host.kickoff(1, [1, 2, 3, 4], lang);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kind: 'kickoff', seq: 1, gameId: 'g1', seed: [1, 2, 3, 4], locale: lang, skin: null, config: null }),
    );

    host.dispose();
  });

  it('kickoff(seq, lang, skin) forwards the resolved skin payload', () => {
    const host = makeHost();
    mountHost(host);

    const skin = { _theme: 'dark' as const, primary: '#4E9B65', leaf_img: 'https://example.com/leaf.png' };
    host.kickoff(1, null, null, skin);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kind: 'kickoff', seq: 1, gameId: 'g1', seed: null, locale: null, skin, config: null }),
    );

    host.dispose();
  });

  it('kickoff(seq, lang, skin, config) forwards the resolved config payload', () => {
    const host = makeHost();
    mountHost(host);

    const config = { show_high_score: true, difficulty: 'hard' };
    host.kickoff(1, null, null, null, config);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kind: 'kickoff', seq: 1, gameId: 'g1', seed: null, locale: null, skin: null, config }),
    );

    host.dispose();
  });

  it('setLayoutContext sends a layout-context message', () => {
    const host = makeHost();
    mountHost(host);

    host.setLayoutContext('fullscreen');
    expect(sendSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kind: 'layout-context', layout: 'fullscreen' }),
    );

    host.dispose();
  });

  it('dispose settles a pending waitManifest with null', async () => {
    const host = makeHost();
    mountHost(host);

    const promise = host.waitManifest(5_000);
    host.dispose();
    const result = await promise;
    expect(result).toBeNull();
  });
});
