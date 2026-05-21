import { describe, it, expect } from 'vitest';
import { resolveAssetUrl } from '../../../src/skin/url.js';

describe('resolveAssetUrl', () => {
  it('passes data: URI through verbatim', () => {
    expect(resolveAssetUrl('data:image/png;base64,abc', 'https://cdn.example.com/pkg/'))
      .toBe('data:image/png;base64,abc');
  });
  it('passes https:// absolute URL through verbatim', () => {
    expect(resolveAssetUrl('https://cdn.example.com/x.png', 'https://other.example.com/pkg/'))
      .toBe('https://cdn.example.com/x.png');
  });
  it('passes http:// absolute URL through verbatim', () => {
    expect(resolveAssetUrl('http://cdn.example.com/x.png', 'https://other.example.com/pkg/'))
      .toBe('http://cdn.example.com/x.png');
  });
  it('passes protocol-relative // URL through verbatim', () => {
    expect(resolveAssetUrl('//cdn.example.com/x.png', 'https://pkg.example.com/'))
      .toBe('//cdn.example.com/x.png');
  });
  it('resolves bundle-relative path against base URL', () => {
    expect(resolveAssetUrl('/assets/leaf.png', 'https://unpkg.com/@scope/pkg@1.2.3/'))
      .toBe('https://unpkg.com/assets/leaf.png');
  });
  it('resolves relative path (no slash) against base URL', () => {
    expect(resolveAssetUrl('leaf.png', 'https://unpkg.com/@scope/pkg@1.2.3/'))
      .toBe('https://unpkg.com/@scope/pkg@1.2.3/leaf.png');
  });
  it('passes path through verbatim when baseUrl is null', () => {
    expect(resolveAssetUrl('/leaf.png', null)).toBe('/leaf.png');
  });
});
