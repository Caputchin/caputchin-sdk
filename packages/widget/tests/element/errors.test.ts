import { describe, it, expect } from 'vitest';
import { fireError, mapIframeErrorCode, RECOVERABLE, type ErrorCode } from '../../src/errors.js';

const ALL_CODES: ErrorCode[] = [
  'invalid-config', 'resolve-failed', 'iframe-load-failed', 'iframe-script-blocked',
  'game-not-registered', 'game-error-relayed', 'postmessage-bad-origin',
  'cap-solve-failed', 'cap-redeem-failed', 'form-not-found',
];

describe('fireError', () => {
  it('dispatches CustomEvent with correct detail', () => {
    const el = document.createElement('div');
    let received: CustomEvent | null = null;
    el.addEventListener('error', (e) => { received = e as CustomEvent; });
    fireError(el, 'invalid-config', 'test message');
    expect(received).not.toBeNull();
    expect((received as CustomEvent).detail.code).toBe('invalid-config');
    expect((received as CustomEvent).detail.message).toBe('test message');
  });

  it('omits originalCode from detail when not provided', () => {
    const el = document.createElement('div');
    let received: CustomEvent | null = null;
    el.addEventListener('error', (e) => { received = e as CustomEvent; });
    fireError(el, 'invalid-config', 'm');
    expect(Object.prototype.hasOwnProperty.call((received as unknown as CustomEvent).detail, 'originalCode')).toBe(false);
  });

  it('includes originalCode in detail when provided', () => {
    const el = document.createElement('div');
    let received: CustomEvent | null = null;
    el.addEventListener('error', (e) => { received = e as CustomEvent; });
    fireError(el, 'game-error-relayed', 'm', 'TIMEOUT');
    expect((received as unknown as CustomEvent).detail.code).toBe('game-error-relayed');
    expect((received as unknown as CustomEvent).detail.originalCode).toBe('TIMEOUT');
  });
});

describe('mapIframeErrorCode', () => {
  it('passes through forwardable codes with no originalCode', () => {
    expect(mapIframeErrorCode('game-not-registered')).toEqual({ code: 'game-not-registered' });
    expect(mapIframeErrorCode('iframe-script-blocked')).toEqual({ code: 'iframe-script-blocked' });
    expect(mapIframeErrorCode('game-error-relayed')).toEqual({ code: 'game-error-relayed' });
  });

  it('remaps unknown author codes to game-error-relayed and preserves the original via originalCode', () => {
    expect(mapIframeErrorCode('TIMEOUT')).toEqual({ code: 'game-error-relayed', originalCode: 'TIMEOUT' });
    expect(mapIframeErrorCode('out-of-lives')).toEqual({ code: 'game-error-relayed', originalCode: 'out-of-lives' });
  });

  it('treats unknown codes that look like ErrorCodes but are not as remappable', () => {
    expect(mapIframeErrorCode('invalid-config')).toEqual({ code: 'game-error-relayed', originalCode: 'invalid-config' });
    expect(mapIframeErrorCode('cap-solve-failed')).toEqual({ code: 'game-error-relayed', originalCode: 'cap-solve-failed' });
  });
});

describe('RECOVERABLE map', () => {
  it('covers all ErrorCode values', () => {
    for (const code of ALL_CODES) {
      expect(typeof RECOVERABLE[code]).toBe('boolean');
    }
  });

  it('postmessage-bad-origin is recoverable', () => expect(RECOVERABLE['postmessage-bad-origin']).toBe(true));
  it('cap-solve-failed is recoverable', () => expect(RECOVERABLE['cap-solve-failed']).toBe(true));
  it('cap-redeem-failed is recoverable', () => expect(RECOVERABLE['cap-redeem-failed']).toBe(true));
  it('invalid-config is not recoverable', () => expect(RECOVERABLE['invalid-config']).toBe(false));
  it('form-not-found is not recoverable', () => expect(RECOVERABLE['form-not-found']).toBe(false));
});
