import { describe, it, expect } from 'vitest';
import { isIframeToWidget } from '../../../src/protocol/messages.js';

describe('isIframeToWidget', () => {
  it('accepts game-started', () => expect(isIframeToWidget({ kind: 'game-started', seq: 1 })).toBe(true));
  it('accepts game-complete', () => expect(isIframeToWidget({ kind: 'game-complete', seq: 2, score: 100, durationMs: 5000 })).toBe(true));
  it('accepts game-error', () => expect(isIframeToWidget({ kind: 'game-error', seq: 3, code: 'e', message: 'm' })).toBe(true));
  it('rejects unknown kind', () => expect(isIframeToWidget({ kind: 'kickoff', seq: 1 })).toBe(false));
  it('rejects missing seq', () => expect(isIframeToWidget({ kind: 'game-started' })).toBe(false));
  it('rejects null', () => expect(isIframeToWidget(null)).toBe(false));
  it('rejects primitive', () => expect(isIframeToWidget('game-started')).toBe(false));
  it('rejects missing kind', () => expect(isIframeToWidget({ seq: 1 })).toBe(false));
});
