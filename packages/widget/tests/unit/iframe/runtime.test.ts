import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const runtimeSrc = readFileSync(
  resolve(__dirname, '../../../src/iframe/runtime.iife.ts'),
  'utf-8'
);

describe('runtime.iife.ts source checks', () => {
  it('registers securitypolicyviolation listener for iframe-script-blocked', () => {
    expect(runtimeSrc).toContain('securitypolicyviolation');
    expect(runtimeSrc).toContain('iframe-script-blocked');
  });

  it('registers error listener for game-error-relayed', () => {
    expect(runtimeSrc).toContain("window.addEventListener('error'");
    expect(runtimeSrc).toContain('game-error-relayed');
  });

  it('registers unhandledrejection listener', () => {
    expect(runtimeSrc).toContain("window.addEventListener('unhandledrejection'");
  });

  it('posts game-started after factory invocation', () => {
    expect(runtimeSrc).toContain("'game-started'");
  });

  it('validates event.source === window.parent before kickoff', () => {
    expect(runtimeSrc).toContain('event.source !== window.parent');
  });
});
