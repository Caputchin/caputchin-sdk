import { describe, it, expect, beforeEach } from 'vitest';
import { getWidget, getGame } from '../fixtures/test-element';
import type { CaputchinWidgetShape, CaputchinGameShape } from '../../src/types';

declare global {
  var __CAPUTCHIN_API_HOST__: string;
}
(globalThis as unknown as { __CAPUTCHIN_API_HOST__: string }).__CAPUTCHIN_API_HOST__ = 'https://api.test.com';

describe('CaputchinWidget methods', () => {
  let el: CaputchinWidgetShape;

  function mount(attrs: Record<string, string>): void {
    el = getWidget(attrs) as unknown as CaputchinWidgetShape;
    document.body.appendChild(el);
  }

  it('start() is callable on simple mode', () => {
    mount({ sitekey: 'k', mode: 'simple', trigger: 'click' });
    expect(() => el.start()).not.toThrow();
    el.remove();
  });

  it('start() is callable on invisible mode', () => {
    mount({ sitekey: 'k', mode: 'invisible', trigger: 'manual' });
    expect(() => el.start()).not.toThrow();
    el.remove();
  });

  it('does NOT expose pass() (cap widget has no game payload)', () => {
    mount({ sitekey: 'k', mode: 'simple' });
    expect((el as unknown as Record<string, unknown>)['pass']).toBeUndefined();
    el.remove();
  });

  it('does NOT expose setNickname() (scoreboards are game-only)', () => {
    mount({ sitekey: 'k', mode: 'simple' });
    expect((el as unknown as Record<string, unknown>)['setNickname']).toBeUndefined();
    el.remove();
  });
});

describe('CaputchinGame methods', () => {
  let el: CaputchinGameShape;
  let errors: Array<{ code: string; message: string }>;

  beforeEach(() => {
    errors = [];
  });

  function mount(attrs: Record<string, string>): void {
    el = getGame(attrs) as unknown as CaputchinGameShape;
    el.addEventListener('error', (e) => {
      errors.push((e as CustomEvent).detail as { code: string; message: string });
    });
    document.body.appendChild(el);
  }

  it('start() callable on inline (implicit auto trigger)', () => {
    mount({ sitekey: 'k', game: '@x/y', layout: 'inline' });
    expect(() => el.start()).not.toThrow();
    el.remove();
  });

  it('start() callable on modal (implicit click trigger)', () => {
    mount({ sitekey: 'k', game: '@x/y', layout: 'modal' });
    expect(() => el.start()).not.toThrow();
    el.remove();
  });

  it('does NOT expose pass() — game always runs inside the iframe', () => {
    mount({ sitekey: 'k', game: '@x/y' });
    expect((el as unknown as Record<string, unknown>)['pass']).toBeUndefined();
    el.remove();
  });

  it('warns on explicit trigger attr (ignored — trigger is implicit per layout)', () => {
    mount({ sitekey: 'k', game: '@x/y', trigger: 'manual' });
    expect(errors.some((e) => e.code === 'invalid-config' && e.message.includes('trigger='))).toBe(true);
    el.remove();
  });

  it('setNickname() throws not-implemented', () => {
    mount({ sitekey: 'k', game: '@x/y' });
    expect(() => el.setNickname('ABC')).toThrow(/not implemented/);
    el.remove();
  });
});
