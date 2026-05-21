import { describe, it, expect } from 'vitest';
import { schemaTypeOf, validateSkinValue } from '../../../src/skin/types.js';

describe('schemaTypeOf', () => {
  it('returns the bare type string form', () => {
    expect(schemaTypeOf('color')).toBe('color');
    expect(schemaTypeOf('image')).toBe('image');
  });
  it('returns the .type field from the descriptor form', () => {
    expect(schemaTypeOf({ type: 'audio', name: 'Theme', description: 'tune' })).toBe('audio');
  });
  it('returns null for undefined / missing entry', () => {
    expect(schemaTypeOf(undefined)).toBeNull();
  });
});

describe('validateSkinValue — color', () => {
  it('accepts #rgb', () => expect(validateSkinValue('color', '#fff').ok).toBe(true));
  it('accepts #rgba', () => expect(validateSkinValue('color', '#fff0').ok).toBe(true));
  it('accepts #rrggbb', () => expect(validateSkinValue('color', '#FFEECC').ok).toBe(true));
  it('accepts #rrggbbaa', () => expect(validateSkinValue('color', '#FFEECCDD').ok).toBe(true));
  it('accepts rgb()', () => expect(validateSkinValue('color', 'rgb(255, 0, 0)').ok).toBe(true));
  it('accepts rgba()', () => expect(validateSkinValue('color', 'rgba(255, 0, 0, 0.5)').ok).toBe(true));
  it('rejects hsl()', () => expect(validateSkinValue('color', 'hsl(0,100%,50%)').ok).toBe(false));
  it('rejects named color', () => expect(validateSkinValue('color', 'red').ok).toBe(false));
  it('rejects #zzz', () => expect(validateSkinValue('color', '#zzz').ok).toBe(false));
});

describe('validateSkinValue — scheme allow-list (security)', () => {
  it('rejects javascript: even when payload smuggles a fake extension', () => {
    const v = validateSkinValue('image', 'javascript:alert(1)//x.png');
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toContain('javascript');
  });
  it('rejects javascript: on audio', () => {
    expect(validateSkinValue('audio', 'javascript:alert(1)//x.mp3').ok).toBe(false);
  });
  it('rejects javascript: on video', () => {
    expect(validateSkinValue('video', 'javascript:alert(1)//x.mp4').ok).toBe(false);
  });
  it('rejects file: scheme', () => {
    expect(validateSkinValue('image', 'file:///etc/passwd.png').ok).toBe(false);
  });
  it('rejects vbscript: scheme', () => {
    expect(validateSkinValue('image', 'vbscript:msgbox(1)//x.png').ok).toBe(false);
  });
  it('rejects about: scheme', () => {
    expect(validateSkinValue('image', 'about:blank.png').ok).toBe(false);
  });
});

describe('validateSkinValue — image', () => {
  it('accepts .png / .jpg / .jpeg / .webp / .svg / .gif', () => {
    for (const ext of ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif']) {
      expect(validateSkinValue('image', `https://example.com/x.${ext}`).ok).toBe(true);
    }
  });
  it('preserves query string and hash on URL during ext check', () => {
    expect(validateSkinValue('image', 'https://x.com/leaf.png?v=2#frag').ok).toBe(true);
  });
  it('accepts uppercase extensions (case-insensitive)', () => {
    for (const ext of ['PNG', 'JPG', 'JPEG', 'WebP', 'SVG', 'GIF']) {
      expect(validateSkinValue('image', `https://example.com/x.${ext}`).ok).toBe(true);
    }
  });
  it('rejects .bmp', () => {
    const v = validateSkinValue('image', 'https://x.com/x.bmp');
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toContain('.bmp');
  });
  it('rejects no-extension url', () => expect(validateSkinValue('image', 'https://x.com/leaf').ok).toBe(false));
  it('accepts data:image/png;base64,abc', () => expect(validateSkinValue('image', 'data:image/png;base64,abc').ok).toBe(true));
  it('accepts data:image/svg+xml;utf8,abc', () => expect(validateSkinValue('image', 'data:image/svg+xml;utf8,abc').ok).toBe(true));
  it('rejects data:image/bmp;base64,abc', () => expect(validateSkinValue('image', 'data:image/bmp;base64,abc').ok).toBe(false));
  it('rejects data: missing MIME', () => expect(validateSkinValue('image', 'data:;base64,abc').ok).toBe(false));
});

describe('validateSkinValue — audio', () => {
  it('accepts .mp3 / .ogg / .wav', () => {
    for (const ext of ['mp3', 'ogg', 'wav']) {
      expect(validateSkinValue('audio', `https://example.com/x.${ext}`).ok).toBe(true);
    }
  });
  it('rejects .m4a', () => expect(validateSkinValue('audio', 'https://x.com/x.m4a').ok).toBe(false));
  it('accepts data:audio/mpeg;base64,abc', () => expect(validateSkinValue('audio', 'data:audio/mpeg;base64,abc').ok).toBe(true));
});

describe('validateSkinValue — video', () => {
  it('accepts .mp4 / .webm', () => {
    for (const ext of ['mp4', 'webm']) {
      expect(validateSkinValue('video', `https://example.com/x.${ext}`).ok).toBe(true);
    }
  });
  it('rejects .mov', () => expect(validateSkinValue('video', 'https://x.com/x.mov').ok).toBe(false));
  it('accepts data:video/mp4;base64,abc', () => expect(validateSkinValue('video', 'data:video/mp4;base64,abc').ok).toBe(true));
});
