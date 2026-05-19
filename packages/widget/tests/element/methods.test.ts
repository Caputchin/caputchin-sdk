import { describe, it, expect, beforeEach } from 'vitest';
import { getTestElement } from '../fixtures/test-element';
import type { CaputchinElementShape } from '../../src/types';

declare global {
  var __CAPUTCHIN_API_HOST__: string;
}
(globalThis as unknown as { __CAPUTCHIN_API_HOST__: string }).__CAPUTCHIN_API_HOST__ = 'https://api.test.com';

describe('widget methods — out-of-scope behavior', () => {
  let el: CaputchinElementShape;
  let errors: Array<{ code: string; message: string }>;

  beforeEach(() => {
    errors = [];
  });

  function mount(attrs: Record<string, string>): void {
    el = getTestElement(attrs) as unknown as CaputchinElementShape;
    el.addEventListener('error', (e) => {
      errors.push((e as CustomEvent).detail as { code: string; message: string });
    });
    document.body.appendChild(el);
  }

  it('start() is callable on simple mode (force-start)', () => {
    mount({ sitekey: 'k', mode: 'simple', trigger: 'click' });
    expect(() => el.start()).not.toThrow();
    el.remove();
  });

  it('start() noops + fires invalid-call on game-only', () => {
    mount({ mode: 'game-only', game: '@x/y' });
    el.start();
    expect(errors.some((e) => e.code === 'invalid-call' && e.message.includes('start'))).toBe(true);
    el.remove();
  });

  it('pass() noops + fires invalid-call on simple mode', () => {
    mount({ sitekey: 'k', mode: 'simple', trigger: 'manual' });
    el.pass({ score: 0.5 });
    expect(errors.some((e) => e.code === 'invalid-call' && e.message.includes('pass'))).toBe(true);
    el.remove();
  });

  it('pass() noops + fires invalid-call on game+auto', () => {
    mount({ sitekey: 'k', mode: 'game', trigger: 'auto', game: '@x/y' });
    el.pass({ score: 0.5 });
    expect(errors.some((e) => e.code === 'invalid-call' && e.message.includes('pass'))).toBe(true);
    el.remove();
  });

  it('setNickname() throws not-implemented', () => {
    mount({ sitekey: 'k', mode: 'simple' });
    expect(() => el.setNickname('ABC')).toThrow(/not implemented/);
    el.remove();
  });
});
