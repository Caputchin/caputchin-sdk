import { describe, it, expect, beforeEach } from 'vitest';
import { readClearance, writeClearance } from '../../src/clearance-store.js';

// Clean the cookie jar between tests so state from one test never leaks into
// the next (readClearance/writeClearance share module-scope memory, and
// document.cookie persists across `it` blocks the same way it would across
// page navigations). happy-dom doesn't honor Max-Age=0 as real deletion, so
// this leaves a present-but-empty `__cptr=` pair - readCookie treats that the
// same as absent (see clearance-store.ts), which is enough for a clean slate.
function clearCookie(): void {
  document.cookie = '__cptr=; Path=/';
}

beforeEach(() => { clearCookie(); });

/** Find the object in the prototype chain that actually owns the `cookie`
 *  accessor (happy-dom defines it on Document.prototype, not the document
 *  instance). Swapping the descriptor there (and restoring it) lets a test
 *  observe the exact string passed to the setter - the only place the
 *  cookie's attributes (SameSite/Path/Max-Age) are visible; a read strips
 *  them, matching real browser behavior. */
function findCookieOwner(obj: object): object {
  let proto: object | null = obj;
  while (proto) {
    if (Object.getOwnPropertyDescriptor(proto, 'cookie')) return proto;
    proto = Object.getPrototypeOf(proto);
  }
  throw new Error('no `cookie` accessor found in the prototype chain');
}

function captureCookieWrites(run: () => void): string[] {
  const owner = findCookieOwner(document);
  const original = Object.getOwnPropertyDescriptor(owner, 'cookie')!;
  const writes: string[] = [];
  Object.defineProperty(owner, 'cookie', {
    configurable: true,
    get: original.get,
    set(v: string) { writes.push(v); },
  });
  try {
    run();
  } finally {
    Object.defineProperty(owner, 'cookie', original);
  }
  return writes;
}

describe('clearance-store', () => {
  it('readClearance returns null when nothing is stored', () => {
    expect(readClearance()).toBeNull();
  });

  it('writeClearance(persist=false) stores in memory; readClearance reads it back', () => {
    writeClearance('mem-token', false, undefined);
    expect(readClearance()).toBe('mem-token');
    // No cookie was set for the non-persisted grant.
    expect(document.cookie).not.toContain('__cptr=mem-token');
  });

  it('writeClearance(persist=true) writes a first-party cookie; readClearance reads it back', () => {
    writeClearance('cookie-token', true, 120_000);
    expect(document.cookie).toContain('__cptr=cookie-token');
    expect(readClearance()).toBe('cookie-token');
  });

  it('a persisted cookie wins over an earlier in-memory grant', () => {
    writeClearance('mem-token', false, undefined);
    writeClearance('cookie-token', true, 120_000);
    expect(readClearance()).toBe('cookie-token');
  });

  it('cookie carries SameSite=Strict, Path=/, and Max-Age derived from reuseWindowMs (no Secure on the default insecure test origin)', () => {
    const writes = captureCookieWrites(() => writeClearance('t', true, 120_000));
    expect(writes).toEqual(['__cptr=t; SameSite=Strict; Path=/; Max-Age=120']);
  });

  it('falls back to a 600s Max-Age when reuseWindowMs is absent', () => {
    const writes = captureCookieWrites(() => writeClearance('t', true, undefined));
    expect(writes).toEqual(['__cptr=t; SameSite=Strict; Path=/; Max-Age=600']);
  });

  it('URL-encodes a clearance value written to the cookie and decodes it back on read', () => {
    const raw = 'a b+c=d';
    writeClearance(raw, true, 60_000);
    expect(readClearance()).toBe(raw);
  });

  // ---- Secure attribute (F3: the clearance is a bearer credential) ----

  it('appends Secure when the origin is secure (isSecureContext)', () => {
    const original = window.isSecureContext;
    (window as { isSecureContext: boolean }).isSecureContext = true;
    try {
      const writes = captureCookieWrites(() => writeClearance('t', true, 120_000));
      expect(writes).toEqual(['__cptr=t; SameSite=Strict; Path=/; Max-Age=120; Secure']);
    } finally {
      (window as { isSecureContext: boolean }).isSecureContext = original;
    }
  });

  it('appends Secure when the origin is https (location.protocol), independent of isSecureContext', () => {
    const originalSecure = window.isSecureContext;
    (window as { isSecureContext: boolean }).isSecureContext = false;
    // `protocol` is an accessor inherited from Location.prototype; shadowing
    // it with an own data property (then deleting the shadow) is the clean
    // way to fake it for one test without disturbing the real accessor.
    Object.defineProperty(window.location, 'protocol', { value: 'https:', configurable: true });
    try {
      const writes = captureCookieWrites(() => writeClearance('t', true, 120_000));
      expect(writes).toEqual(['__cptr=t; SameSite=Strict; Path=/; Max-Age=120; Secure']);
    } finally {
      (window as { isSecureContext: boolean }).isSecureContext = originalSecure;
      delete (window.location as unknown as Record<string, unknown>).protocol;
    }
  });

  it('omits Secure on an insecure origin (default test origin: neither https nor isSecureContext)', () => {
    expect(window.isSecureContext).not.toBe(true);
    expect(window.location.protocol).not.toBe('https:');
    const writes = captureCookieWrites(() => writeClearance('t', true, 120_000));
    expect(writes).toEqual(['__cptr=t; SameSite=Strict; Path=/; Max-Age=120']);
  });
});
