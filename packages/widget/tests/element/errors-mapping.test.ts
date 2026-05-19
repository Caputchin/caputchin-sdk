import { describe, it, expect } from 'vitest';
import { mapIframeErrorCode, fireError } from '../../src/errors';

describe('mapIframeErrorCode', () => {
  it('maps iframe-load-failed → game-load-failed with originalCode', () => {
    const r = mapIframeErrorCode('iframe-load-failed');
    expect(r.code).toBe('game-load-failed');
    expect(r.originalCode).toBe('iframe-load-failed');
  });

  it('maps iframe-script-blocked → game-load-failed', () => {
    expect(mapIframeErrorCode('iframe-script-blocked').code).toBe('game-load-failed');
  });

  it('maps game-not-registered → game-load-failed', () => {
    expect(mapIframeErrorCode('game-not-registered').code).toBe('game-load-failed');
  });

  it('passes game-error-relayed through with no originalCode', () => {
    const r = mapIframeErrorCode('game-error-relayed');
    expect(r.code).toBe('game-error-relayed');
    expect(r.originalCode).toBeUndefined();
  });

  it('wraps unknown raw codes as game-error-relayed with originalCode', () => {
    const r = mapIframeErrorCode('custom-game-thing');
    expect(r.code).toBe('game-error-relayed');
    expect(r.originalCode).toBe('custom-game-thing');
  });
});

describe('fireError', () => {
  it('dispatches an error CustomEvent with code + message', () => {
    const el = document.createElement('div');
    const events: CustomEvent[] = [];
    el.addEventListener('error', (e) => events.push(e as CustomEvent));
    fireError(el, 'invalid-call', 'bad call');
    expect(events).toHaveLength(1);
    expect((events[0]!.detail as { code: string; message: string }).code).toBe('invalid-call');
    expect((events[0]!.detail as { code: string; message: string }).message).toBe('bad call');
  });

  it('includes originalCode in detail when provided', () => {
    const el = document.createElement('div');
    const events: CustomEvent[] = [];
    el.addEventListener('error', (e) => events.push(e as CustomEvent));
    fireError(el, 'game-load-failed', 'm', 'iframe-load-failed');
    expect((events[0]!.detail as { originalCode?: string }).originalCode).toBe('iframe-load-failed');
  });
});
