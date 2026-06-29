import { describe, expect, it } from 'vitest';
import {
  LOCAL_TOOLS,
  renderSiteverifyExample,
  renderWidgetSnippet,
} from '../src/local-tools.js';

describe('renderWidgetSnippet', () => {
  it('emits a plain cap widget with only the sitekey', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_abc123' });
    expect(out).toContain('cdn.jsdelivr.net/npm/@caputchin/widget@3/dist/widget.js');
    expect(out).toContain('<caputchin-widget sitekey="cpt_pub_abc123"></caputchin-widget>');
    expect(out).not.toContain('caputchin-game');
    expect(out).not.toContain('game=');
    expect(out).not.toContain('mode=');
  });

  it('mounts the game host when a game id is supplied', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_x', game: 'owner/bubble-pop' });
    expect(out).toContain('<caputchin-game ');
    expect(out).toContain('game="owner/bubble-pop"');
    expect(out).not.toContain('<caputchin-widget');
  });

  it('joins multiple games with commas on the game host', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_x', games: ['a', 'b', 'c'] });
    expect(out).toContain('<caputchin-game ');
    expect(out).toContain('games="a,b,c"');
  });

  it('falls back to the cap widget for an empty games array', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_x', games: [] });
    expect(out).toContain('<caputchin-widget ');
    expect(out).not.toContain('caputchin-game');
    expect(out).not.toContain('games=');
  });

  it('includes a non-auto layout on the game host', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_x', game: 'a/b', layout: 'modal' });
    expect(out).toContain('layout="modal"');
  });

  it('omits layout=auto since auto is the default', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_x', game: 'a/b', layout: 'auto' });
    expect(out).not.toContain('layout=');
  });

  it('omits trigger=auto since auto is the default', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_x', trigger: 'auto' });
    expect(out).not.toContain('trigger=');
  });

  it('includes a non-auto trigger on the cap widget', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_x', trigger: 'form-submit' });
    expect(out).toContain('trigger="form-submit"');
  });

  it('adds the invisible boolean attribute when requested', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_x', invisible: true });
    expect(out).toContain('<caputchin-widget sitekey="cpt_pub_x" invisible></caputchin-widget>');
  });

  it('uses the cap widget when game is null', () => {
    const out = renderWidgetSnippet({ sitekey: 'cpt_pub_x', game: null });
    expect(out).toContain('<caputchin-widget ');
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
