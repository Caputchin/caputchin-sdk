import { describe, expect, it } from 'vitest';
import {
  LOCAL_TOOLS,
  renderSiteverifyExample,
  renderWidgetSnippet,
} from '../src/local-tools.js';

describe('renderWidgetSnippet', () => {
  it('emits a minimal snippet with only the sitekey', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_abc123' });
    expect(out).toContain('cdn.jsdelivr.net/npm/@caputchin/widget@1/dist/widget.js');
    expect(out).toContain('sitekey="cpt_pub_abc123"');
    expect(out).not.toContain('game=');
    expect(out).not.toContain('games=');
    expect(out).not.toContain('mode=');
  });

  it('includes game when supplied', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_x', game: 'bubble-pop' });
    expect(out).toContain('game="bubble-pop"');
  });

  it('joins multiple games with commas', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_x', games: ['a', 'b', 'c'] });
    expect(out).toContain('games="a,b,c"');
  });

  it('omits empty games array', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_x', games: [] });
    expect(out).not.toContain('games=');
  });

  it('omits mode=auto since auto is the default', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_x', mode: 'auto' });
    expect(out).not.toContain('mode=');
  });

  it('includes non-auto mode', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_x', mode: 'form-submit' });
    expect(out).toContain('mode="form-submit"');
  });

  it('omits game when null', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_x', game: null });
    expect(out).not.toContain('game=');
  });
});

describe('renderSiteverifyExample', () => {
  it('emits node fetch snippet for node/javascript/typescript', () => {
    for (const lang of ['node', 'javascript', 'typescript'] as const) {
      const out = renderSiteverifyExample({ language: lang });
      expect(out).toContain('fetch("https://verify.caputchin.com/v1/siteverify"');
      expect(out).toContain('process.env.CAPUTCHIN_SECRET');
    }
  });

  it('emits python requests snippet', () => {
    const out = renderSiteverifyExample({ language: 'python' });
    expect(out).toContain('import os, requests');
    expect(out).toContain('os.environ["CAPUTCHIN_SECRET"]');
  });

  it('emits go net/http snippet', () => {
    const out = renderSiteverifyExample({ language: 'go' });
    expect(out).toContain('http.Post(');
    expect(out).toContain('os.Getenv("CAPUTCHIN_SECRET")');
  });

  it('emits php file_get_contents snippet', () => {
    const out = renderSiteverifyExample({ language: 'php' });
    expect(out).toContain("getenv('CAPUTCHIN_SECRET')");
    expect(out).toContain('file_get_contents');
  });

  it('emits curl snippet', () => {
    const out = renderSiteverifyExample({ language: 'curl' });
    expect(out).toContain('curl -sS -X POST https://verify.caputchin.com/v1/siteverify');
  });

  it('reflects CAPUTCHIN_VERIFY_HOST override across snippets (single source)', () => {
    const prev = process.env.CAPUTCHIN_VERIFY_HOST;
    process.env.CAPUTCHIN_VERIFY_HOST = 'https://staging.example.com/';
    try {
      const out = renderSiteverifyExample({ language: 'curl' });
      expect(out).toContain('https://staging.example.com/v1/siteverify');
      expect(out).not.toContain('caputchin.com');
    } finally {
      if (prev === undefined) delete process.env.CAPUTCHIN_VERIFY_HOST;
      else process.env.CAPUTCHIN_VERIFY_HOST = prev;
    }
  });

  it.each([
    ['node'],
    ['javascript'],
    ['typescript'],
    ['python'],
    ['go'],
    ['php'],
    ['curl'],
  ] as const)('snapshot: %s', (lang) => {
    expect(renderSiteverifyExample({ language: lang })).toMatchSnapshot();
  });
});

describe('LOCAL_TOOLS catalog', () => {
  it('exposes widget_snippet and siteverify_example', () => {
    const names = LOCAL_TOOLS.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(['caputchin_widget_snippet', 'caputchin_siteverify_example']),
    );
  });

  it('widget_snippet handler validates input via zod and returns markup', async () => {
    const tool = LOCAL_TOOLS.find((t) => t.name === 'caputchin_widget_snippet');
    expect(tool).toBeTruthy();
    const out = await tool!.handler({ sitekey: 'cpt_pub_z' });
    expect(out).toContain('cpt_pub_z');
  });

  it('widget_snippet handler rejects missing sitekey', async () => {
    const tool = LOCAL_TOOLS.find((t) => t.name === 'caputchin_widget_snippet');
    await expect(tool!.handler({})).rejects.toThrow();
  });

  it('siteverify_example handler rejects unsupported language', async () => {
    const tool = LOCAL_TOOLS.find((t) => t.name === 'caputchin_siteverify_example');
    await expect(tool!.handler({ language: 'cobol' })).rejects.toThrow();
  });
});
