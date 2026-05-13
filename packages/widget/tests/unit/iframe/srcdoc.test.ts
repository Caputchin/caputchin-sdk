import { describe, it, expect } from 'vitest';
import { buildSrcdoc } from '../../../src/iframe/srcdoc.js';

const RUNTIME = 'console.log("runtime")';
const SHA = 'abc123def456';

const base = {
  gameId: null,
  gameUrl: null,
  integrity: null,
  runtimeJs: RUNTIME,
  runtimeSha256: SHA,
};

describe('buildSrcdoc', () => {
  it('includes runtime JS inline', () => {
    const html = buildSrcdoc(base);
    expect(html).toContain(RUNTIME);
  });

  it('CSP includes sha256 of runtime', () => {
    const html = buildSrcdoc(base);
    expect(html).toContain(`'sha256-${SHA}'`);
  });

  it('CSP default-src none', () => {
    const html = buildSrcdoc(base);
    expect(html).toContain("default-src 'none'");
  });

  it('CSP connect-src none', () => {
    const html = buildSrcdoc(base);
    expect(html).toContain("connect-src 'none'");
  });

  it('CSP style-src unsafe-inline', () => {
    const html = buildSrcdoc(base);
    expect(html).toContain("style-src 'unsafe-inline'");
  });

  it('includes game URL in CSP script-src', () => {
    const html = buildSrcdoc({ ...base, gameUrl: 'https://cdn.example.com/game.js', gameId: 'g1' });
    expect(html).toContain('https://cdn.example.com/game.js');
  });

  it('escapes double-quote in game URL', () => {
    expect(() => buildSrcdoc({ ...base, gameUrl: 'https://cdn.example.com/game".js', gameId: 'g1' }))
      .toThrow();
  });

  it('rejects non-HTTPS game URL', () => {
    expect(() => buildSrcdoc({ ...base, gameUrl: 'http://cdn.example.com/game.js', gameId: 'g1' }))
      .toThrow();
  });

  it('includes integrity attribute for valid sha384', () => {
    const integrity = 'sha384-' + 'A'.repeat(64);
    const html = buildSrcdoc({
      ...base,
      gameUrl: 'https://cdn.example.com/game.js',
      gameId: 'g1',
      integrity,
    });
    expect(html).toContain(`integrity="${integrity}"`);
  });

  it('omits integrity for invalid format', () => {
    const html = buildSrcdoc({
      ...base,
      gameUrl: 'https://cdn.example.com/game.js',
      gameId: 'g1',
      integrity: 'sha256-tooshort',
    });
    expect(html).not.toContain('integrity=');
  });

  it('HTML-encodes < in gameId attribute', () => {
    const html = buildSrcdoc({ ...base, gameUrl: 'https://cdn.example.com/g.js', gameId: '<script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('HTML-encodes > in gameId attribute', () => {
    const html = buildSrcdoc({ ...base, gameUrl: 'https://cdn.example.com/g.js', gameId: '>xss' });
    expect(html).toContain('&gt;xss');
  });

  it('HTML-encodes & in gameId attribute', () => {
    const html = buildSrcdoc({ ...base, gameUrl: 'https://cdn.example.com/g.js', gameId: 'a&b' });
    expect(html).toContain('&amp;b');
  });

  it("escapes single-quote in gameId attribute", () => {
    const html = buildSrcdoc({ ...base, gameUrl: 'https://cdn.example.com/g.js', gameId: "a'b" });
    expect(html).not.toContain("a'b");
    expect(html).toContain('&#39;');
  });

  it('resolves same-origin absolute path to full URL in CSP and script-src', () => {
    const html = buildSrcdoc({ ...base, gameUrl: '/examples/simple-game.js', gameId: 'g1' });
    expect(html).toContain(location.origin + '/examples/simple-game.js');
    expect(html).not.toContain('script-src \'sha256-' + SHA + '\' /examples');
  });
});
