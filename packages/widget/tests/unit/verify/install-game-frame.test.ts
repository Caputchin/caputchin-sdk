import { describe, it, expect, vi } from 'vitest';
import { installGameFrame, applyIframeSize } from '../../../src/verify/install-game-frame.js';
import type { GameConfig } from '../../../src/config/game.js';
import type { ResolvedAxes } from '../../../src/bootstrap/types.js';

// The manifest handshake is gone. installGameFrame no
// longer resolves client-side or waits for a manifest; it kicks off with the
// SERVER-resolved axes (proving the config=null fill flows to the live game)
// and sizes from the server-sent preferred footprint.

function mockHost() {
  const calls: { kickoff?: unknown; size?: [unknown, unknown] } = {};
  return {
    mount: vi.fn(),
    getIframe: () => ({}) as HTMLIFrameElement,
    setSize: vi.fn((w: unknown, h: unknown) => { calls.size = [w, h]; }),
    setLayoutContext: vi.fn(),
    kickoff: vi.fn((seq: number, seed: unknown, locale: unknown, skin: unknown, config: unknown) => {
      calls.kickoff = { seq, seed, locale, skin, config };
    }),
    calls,
  };
}
const mockGp = () => ({ getIframeSlot: () => document.createElement('div') });
const cfg = (p: Partial<GameConfig>): GameConfig => ({ locale: null, skin: null, ...p }) as unknown as GameConfig;

describe('installGameFrame', () => {
  it('kicks off with the server-resolved axes (incl config) + sizes from preferred', async () => {
    const host = mockHost();
    const resolved: ResolvedAxes = {
      locale: { _lang: 'en', _direction: 'ltr' } as never,
      skin: { _theme: 'dark' } as never,
      config: { pairs: 8 } as never,
    };
    await installGameFrame(
      document.createElement('div'),
      mockGp() as never,
      cfg({ layout: 'inline' as never }),
      host as never,
      () => {},
      () => {},
      resolved,
      { width: 320, height: 480 },
      async () => null,
    );
    const k = host.calls.kickoff as { locale: unknown; skin: unknown; config: unknown };
    expect(k.locale).toEqual(resolved.locale);
    expect(k.skin).toEqual(resolved.skin);
    expect(k.config).toEqual({ pairs: 8 }); // the old cfg=null, now server-resolved
    expect(host.calls.size).toEqual([320, 480]);
  });

  it('null resolved → kickoff with null axes (game uses bundled defaults)', async () => {
    const host = mockHost();
    await installGameFrame(document.createElement('div'), mockGp() as never, cfg({}), host as never, () => {}, () => {}, null, null, async () => null);
    const k = host.calls.kickoff as { locale: unknown; config: unknown };
    expect(k.locale).toBeNull();
    expect(k.config).toBeNull();
  });

  it('routes a synchronous mount/build throw to onLoadFailed (never swallowed) + no kickoff', async () => {
    const host = mockHost();
    host.mount = vi.fn(() => { throw new Error('game-src must be HTTPS: "http://evil.test/x.js"'); });
    const onLoadFailed = vi.fn();
    await installGameFrame(
      document.createElement('div'), mockGp() as never, cfg({}), host as never,
      onLoadFailed, () => {}, null, null, async () => null,
    );
    expect(onLoadFailed).toHaveBeenCalledTimes(1);
    expect(onLoadFailed.mock.calls[0][0]).toBe('iframe-load-failed');
    expect(onLoadFailed.mock.calls[0][1]).toContain('must be HTTPS');
    // bailed before kickoff — a failed frame never starts.
    expect(host.kickoff).not.toHaveBeenCalled();
  });
});

describe('applyIframeSize', () => {
  it('uses the preferred footprint; width="full" stretches to 100%', () => {
    const host = mockHost();
    applyIframeSize(host as never, cfg({ width: 'full' as never }), { width: 320, height: 480 });
    expect(host.calls.size).toEqual(['100%', 480]);
  });

  it('falls back to defaults when no preferred footprint', () => {
    const host = mockHost();
    applyIframeSize(host as never, cfg({}), null);
    expect(host.calls.size).toEqual([400, 300]);
  });
});
