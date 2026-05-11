import { describe, it, expect } from 'vitest';
import { assembleWrappedToken } from '../../src/token.js';

describe('assembleWrappedToken', () => {
  it('passes token through', () => {
    expect(assembleWrappedToken({ token: 'tok' }).token).toBe('tok');
  });
  it('score present', () => {
    expect(assembleWrappedToken({ token: 't', score: 42 }).score).toBe(42);
  });
  it('score absent → null', () => {
    expect(assembleWrappedToken({ token: 't' }).score).toBeNull();
  });
  it('score null → null', () => {
    expect(assembleWrappedToken({ token: 't', score: null }).score).toBeNull();
  });
  it('durationMs present', () => {
    expect(assembleWrappedToken({ token: 't', durationMs: 1000 }).durationMs).toBe(1000);
  });
  it('durationMs absent → null', () => {
    expect(assembleWrappedToken({ token: 't' }).durationMs).toBeNull();
  });
  it('durationMs null → null', () => {
    expect(assembleWrappedToken({ token: 't', durationMs: null }).durationMs).toBeNull();
  });
  it('both null', () => {
    const r = assembleWrappedToken({ token: 't', score: null, durationMs: null });
    expect(r.score).toBeNull();
    expect(r.durationMs).toBeNull();
  });
});
