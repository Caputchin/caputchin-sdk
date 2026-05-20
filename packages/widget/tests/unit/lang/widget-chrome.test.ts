import { describe, it, expect } from 'vitest';
import { resolveWidgetChrome } from '../../../src/lang/widget-chrome.js';

describe('resolveWidgetChrome', () => {
  it('defaults to en + ltr when no navigator hint provided', () => {
    const chrome = resolveWidgetChrome([]);
    expect(chrome.iso).toBe('en');
    expect(chrome.direction).toBe('ltr');
    expect(chrome.strings.simpleVerify).toBe('Verify');
    expect(chrome.strings.brandName).toBe('Caputchin');
    expect(chrome.strings.brandTag).toBe('see no data');
  });

  it('resolves to ar + rtl when navigator language is ar', () => {
    const chrome = resolveWidgetChrome(['ar']);
    expect(chrome.iso).toBe('ar');
    expect(chrome.direction).toBe('rtl');
    expect(chrome.strings.simpleVerify).toBe('تحقق');
    expect(chrome.strings.brandName).toBe('كابوتشين');
    expect(chrome.strings.overlayClose).toBe('إغلاق');
  });

  it('normalizes "ar-EG" to ar via primary subtag', () => {
    const chrome = resolveWidgetChrome(['ar-EG']);
    expect(chrome.iso).toBe('ar');
    expect(chrome.direction).toBe('rtl');
  });

  it('falls back to en when navigator language has no matching preset', () => {
    const chrome = resolveWidgetChrome(['ja']);
    expect(chrome.iso).toBe('en');
    expect(chrome.direction).toBe('ltr');
  });
});
