import { describe, it, expect, beforeAll, vi } from 'vitest';
import { getWidget } from '../../fixtures/test-element';

declare global {
  var __CAPUTCHIN_API_HOST__: string;
}
(globalThis as unknown as { __CAPUTCHIN_API_HOST__: string }).__CAPUTCHIN_API_HOST__ = 'https://api.test.com';

// The widget calls /api/v1/widget/bootstrap before paint. In jsdom/happy-dom
// the real network is unreachable; stub fetch to return an
// empty 200 so the bootstrap promise resolves synchronously-ish (one
// microtask hop) and `flushMount` lets the .then handler run before the
// test asserts.
beforeAll(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
});

// The widget element defers paint until /api/v1/widget/bootstrap resolves or
// times out (max 2s). In jsdom with no real backend, fetch
// rejects almost immediately and the bootstrap client returns null → mount
// runs with bundled-only. The microtask queue still needs a tick to flush;
// `flushMount` waits one macrotask which guarantees all chained microtasks
// (fetch reject → catch → return null → element .then → completeMount) have
// fired before the test asserts.
function flushMount(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('visible (default) widget presentation', () => {
  it('renders a checkbox with Caputchin branding on mount (inside shadow root)', async () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click' });
    document.body.appendChild(el);
    await flushMount();
    const shadow = el.shadowRoot;
    expect(shadow).not.toBeNull();
    const checkbox = shadow!.querySelector('[role="checkbox"]');
    expect(checkbox).not.toBeNull();
    expect(shadow!.textContent).toContain('Caputchin');
    expect(shadow!.textContent).toContain('see no data');
    // State text replaces the old "I'm not a robot" label. Idle = "Verify".
    expect(shadow!.textContent).toContain('Verify');
    // Light-DOM children stay empty — internals are isolated.
    expect(el.querySelector('[role="checkbox"]')).toBeNull();
    el.remove();
  });

  it('removes the checkbox on disconnect', async () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click' });
    document.body.appendChild(el);
    await flushMount();
    expect(el.shadowRoot!.querySelector('[role="checkbox"]')).not.toBeNull();
    el.remove();
    expect(el.shadowRoot!.querySelector('[role="checkbox"]')).toBeNull();
  });
});

describe('invisible widget presentation', () => {
  it('renders no DOM', async () => {
    const el = getWidget({ sitekey: 'k', invisible: '' });
    document.body.appendChild(el);
    await flushMount();
    expect(el.children.length).toBe(0);
    expect(el.textContent?.trim()).toBe('');
    el.remove();
  });
});

describe('widget lang attribute', () => {
  it('locale="ar" flips shell to arabic strings + dir="rtl"', async () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click', locale: 'ar' });
    document.body.appendChild(el);
    await flushMount();
    expect(el.getAttribute('dir')).toBe('rtl');
    const text = el.shadowRoot!.textContent ?? '';
    expect(text).toContain('تحقق'); // Verify
    expect(text).toContain('كابوتشن'); // Caputchin brand
    el.remove();
  });

  it('locale="ar-EG" normalizes to ar via primary subtag', async () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click', locale: 'ar-EG' });
    document.body.appendChild(el);
    await flushMount();
    expect(el.getAttribute('dir')).toBe('rtl');
    expect(el.shadowRoot!.textContent ?? '').toContain('تحقق');
    el.remove();
  });

  it('inline JSON fires invalid-config + falls back to auto (no dir flip)', async () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click', locale: '{"_lang":"ar"}' });
    const messages: string[] = [];
    el.addEventListener('error', (e) => {
      const detail = (e as CustomEvent).detail as { message?: string };
      if (detail?.message) messages.push(detail.message);
    });
    document.body.appendChild(el);
    await flushMount();
    expect(messages.some((m) => /inline JSON/i.test(m))).toBe(true);
    expect(el.getAttribute('dir')).not.toBe('rtl');
    el.remove();
  });

  it('unknown preset name fires invalid-config + falls back to auto', async () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click', locale: 'xyz' });
    const messages: string[] = [];
    el.addEventListener('error', (e) => {
      const detail = (e as CustomEvent).detail as { message?: string };
      if (detail?.message) messages.push(detail.message);
    });
    document.body.appendChild(el);
    await flushMount();
    expect(messages.some((m) => /xyz/.test(m))).toBe(true);
    el.remove();
  });
});

describe('widget skin attribute', () => {
  it('skin="light" sets data-skin-theme + writes CSS vars for primary', async () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click', skin: 'light' });
    document.body.appendChild(el);
    await flushMount();
    expect(el.getAttribute('data-skin-theme')).toBe('light');
    expect(el.style.getPropertyValue('--cpt-skin-primary')).toBe('#2F6640');
    expect(el.style.getPropertyValue('--cpt-skin-surface_bg')).toBe('#ffffff');
    el.remove();
  });

  it('skin="dark" flips to dark palette CSS vars', async () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click', skin: 'dark' });
    document.body.appendChild(el);
    await flushMount();
    expect(el.getAttribute('data-skin-theme')).toBe('dark');
    expect(el.style.getPropertyValue('--cpt-skin-primary')).toBe('#4E9B65');
    expect(el.style.getPropertyValue('--cpt-skin-surface_bg')).toBe('#182518');
    el.remove();
  });

  it('inline JSON skin fires invalid-config + falls back to auto', async () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click', skin: '{"_theme":"dark"}' });
    const messages: string[] = [];
    el.addEventListener('error', (e) => {
      const detail = (e as CustomEvent).detail as { message?: string };
      if (detail?.message) messages.push(detail.message);
    });
    document.body.appendChild(el);
    await flushMount();
    expect(messages.some((m) => /inline JSON/i.test(m))).toBe(true);
    // auto fallback: prefersDark unknown in test env → defaults to light
    expect(el.getAttribute('data-skin-theme')).toBe('light');
    el.remove();
  });

  it('unknown skin name fires invalid-config + falls back to auto', async () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click', skin: 'midnight' });
    const messages: string[] = [];
    el.addEventListener('error', (e) => {
      const detail = (e as CustomEvent).detail as { message?: string };
      if (detail?.message) messages.push(detail.message);
    });
    document.body.appendChild(el);
    await flushMount();
    expect(messages.some((m) => /midnight/.test(m))).toBe(true);
    el.remove();
  });
});

// Shell brand links come from the bundled `default` preset (+ a server override
// bank at bootstrap). There is no client `config` attribute (config is
// server-authoritative), so there is nothing client-side to select or reject here.
describe('widget brand link wiring', () => {
  it('default brand strip points at caputchin.com + /legal', async () => {
    const el = getWidget({ sitekey: 'k', trigger: 'click' });
    document.body.appendChild(el);
    await flushMount();
    const home = el.shadowRoot!.querySelector('[part="simple-brand-home"]') as HTMLAnchorElement;
    const tag = el.shadowRoot!.querySelector('[part="simple-brand-tag"]') as HTMLAnchorElement;
    expect(home.href).toBe('https://caputchin.com/');
    expect(tag.href).toBe('https://caputchin.com/legal');
    el.remove();
  });
});
