import { describe, it, expect } from 'vitest';
import { fireError, RECOVERABLE, type ErrorCode } from '../../src/errors.js';

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
