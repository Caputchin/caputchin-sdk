import { describe, it, expect, vi } from 'vitest';
import { send } from '../../../src/protocol/channel.js';

describe('channel.send', () => {
  it('posts to "null" origin for srcdoc sandbox defense-in-depth (M5)', () => {
    const postMessageSpy = vi.fn();
    const iframe = {
      contentWindow: { postMessage: postMessageSpy },
    } as unknown as HTMLIFrameElement;

    send(iframe, { kind: 'kickoff', seq: 1, gameId: null, gameUrl: null, integrity: null, sitekey: 's', apiHost: 'h' });

    expect(postMessageSpy).toHaveBeenCalledOnce();
    expect(postMessageSpy.mock.calls[0]![1]).toBe('null');
  });
});
