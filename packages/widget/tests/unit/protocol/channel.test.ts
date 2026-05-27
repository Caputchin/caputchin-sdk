import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { send, listen } from '../../../src/protocol/channel.js';

describe('channel.send', () => {
  it('posts with targetOrigin="*" - sandbox iframe opaque origin requires it (M5)', () => {
    const postMessageSpy = vi.fn();
    const iframe = {
      contentWindow: { postMessage: postMessageSpy },
    } as unknown as HTMLIFrameElement;

    send(iframe, { kind: 'kickoff', seq: 1, gameId: null });

    expect(postMessageSpy).toHaveBeenCalledOnce();
    // "null" is silently dropped by the postMessage spec; "*" is the only
    // valid wildcard targetOrigin for opaque-origin (sandboxed srcdoc) frames.
    expect(postMessageSpy.mock.calls[0]![1]).toBe('*');
  });

  it('sends dispose message with correct shape', () => {
    const postMessageSpy = vi.fn();
    const iframe = { contentWindow: { postMessage: postMessageSpy } } as unknown as HTMLIFrameElement;
    send(iframe, { kind: 'dispose', seq: -1 });
    expect(postMessageSpy.mock.calls[0]![0]).toMatchObject({ kind: 'dispose', seq: -1 });
  });

  it('no-ops when contentWindow is null', () => {
    const iframe = { contentWindow: null } as unknown as HTMLIFrameElement;
    expect(() => send(iframe, { kind: 'dispose', seq: 0 })).not.toThrow();
  });
});

describe('channel.listen', () => {
  let iframe: HTMLIFrameElement;
  let el: HTMLElement;
  let unlisten: (() => void) | null = null;

  beforeEach(() => {
    iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    el = document.createElement('div');
    document.body.appendChild(el);
  });

  afterEach(() => {
    unlisten?.();
    unlisten = null;
    iframe.remove();
    el.remove();
  });

  const dispatchMsg = (data: unknown, source: Window | null, origin: string) => {
    const event = new MessageEvent('message', { data, origin, source });
    window.dispatchEvent(event);
  };

  it('invokes callback for valid game-started from iframe contentWindow', () => {
    const cb = vi.fn();
    unlisten = listen(iframe, el, cb);

    const src = iframe.contentWindow!;
    dispatchMsg({ kind: 'game-started', seq: 1 }, src, 'null');

    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0]![0]).toMatchObject({ kind: 'game-started', seq: 1 });
  });

  it('warns and drops message when origin is not "null"', () => {
    const cb = vi.fn();
    const errors: CustomEvent[] = [];
    el.addEventListener('error', (e) => errors.push(e as CustomEvent));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    unlisten = listen(iframe, el, cb);

    const src = iframe.contentWindow!;
    dispatchMsg({ kind: 'game-started', seq: 1 }, src, 'https://evil.com');

    expect(cb).not.toHaveBeenCalled();
    expect(errors).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unexpected origin'));
    warnSpy.mockRestore();
  });

  it('ignores messages from other sources', () => {
    const cb = vi.fn();
    const errors: CustomEvent[] = [];
    el.addEventListener('error', (e) => errors.push(e as CustomEvent));
    unlisten = listen(iframe, el, cb);

    dispatchMsg({ kind: 'game-started', seq: 1 }, window, 'null');

    expect(cb).not.toHaveBeenCalled();
    expect(errors).toHaveLength(0);
  });

  it('ignores messages with unknown kind', () => {
    const cb = vi.fn();
    unlisten = listen(iframe, el, cb);

    const src = iframe.contentWindow!;
    dispatchMsg({ kind: 'kickoff', seq: 1 }, src, 'null');

    expect(cb).not.toHaveBeenCalled();
  });

  it('ignores messages with missing seq', () => {
    const cb = vi.fn();
    unlisten = listen(iframe, el, cb);

    const src = iframe.contentWindow!;
    dispatchMsg({ kind: 'game-started' }, src, 'null');

    expect(cb).not.toHaveBeenCalled();
  });

  it('unlisten removes handler - subsequent messages ignored', () => {
    const cb = vi.fn();
    unlisten = listen(iframe, el, cb);
    unlisten();
    unlisten = null;

    const src = iframe.contentWindow!;
    dispatchMsg({ kind: 'game-started', seq: 1 }, src, 'null');

    expect(cb).not.toHaveBeenCalled();
  });
});
