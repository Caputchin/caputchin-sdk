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
    // Light-DOM children stay empty - internals are isolated.
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

// The SERVER resolves locale/skin; the element forwards its attrs + visitor
// signals to /bootstrap and APPLIES the resolved presets. Resolution +
// validation (unknown preset, inline JSON rejection) is gated by the platform's
// relocated golden tests, not here.
function stubBootstrap(body: unknown): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('widget lang attribute', () => {
  it('applies the server-resolved locale (rtl + arabic strings)', async () => {
    stubBootstrap({
      widget: { resolved: { locale: { _lang: 'ar', _direction: 'rtl', simpleVerify: 'تحقق', brandName: 'كابوتشن' }, skin: null, config: null } },
      game: null,
    });
    const el = getWidget({ sitekey: 'k', trigger: 'click', locale: 'ar' });
    document.body.appendChild(el);
    await flushMount();
    expect(el.getAttribute('dir')).toBe('rtl');
    const text = el.shadowRoot!.textContent ?? '';
    expect(text).toContain('تحقق');
    expect(text).toContain('كابوتشن');
    el.remove();
  });

  it('forwards the locale attr + visitor signals to the bootstrap for resolution', async () => {
    const fetchFn = stubBootstrap({});
    const el = getWidget({ sitekey: 'k', trigger: 'click', locale: 'ar' });
    document.body.appendChild(el);
    await flushMount();
    expect(String(fetchFn.mock.calls[0]?.[0])).toContain('locale=ar');
    expect(String(fetchFn.mock.calls[0]?.[0])).toContain('prefers_dark=');
    el.remove();
  });

  it('bundled English fallback when the server resolves nothing', async () => {
    stubBootstrap({});
    const el = getWidget({ sitekey: 'k', trigger: 'click' });
    document.body.appendChild(el);
    await flushMount();
    expect(el.getAttribute('dir')).not.toBe('rtl');
    expect(el.shadowRoot!.textContent ?? '').toContain('Verify');
    el.remove();
  });
});

describe('widget skin attribute', () => {
  it('bundled light fallback when the server resolves no skin', async () => {
    stubBootstrap({});
    const el = getWidget({ sitekey: 'k', trigger: 'click' });
    document.body.appendChild(el);
    await flushMount();
    expect(el.getAttribute('data-skin-theme')).toBe('light');
    expect(el.style.getPropertyValue('--cpt-skin-primary')).toBe('#2F6640');
    el.remove();
  });

  it('applies the server-resolved dark skin (theme + CSS vars)', async () => {
    stubBootstrap({
      widget: { resolved: { locale: null, skin: { _theme: 'dark', primary: '#4E9B65', surface_bg: '#182518' }, config: null } },
      game: null,
    });
    const el = getWidget({ sitekey: 'k', trigger: 'click', skin: 'dark' });
    document.body.appendChild(el);
    await flushMount();
    expect(el.getAttribute('data-skin-theme')).toBe('dark');
    expect(el.style.getPropertyValue('--cpt-skin-primary')).toBe('#4E9B65');
    expect(el.style.getPropertyValue('--cpt-skin-surface_bg')).toBe('#182518');
    el.remove();
  });

  it('forwards the skin attr to the bootstrap for resolution', async () => {
    const fetchFn = stubBootstrap({});
    const el = getWidget({ sitekey: 'k', trigger: 'click', skin: 'dark' });
    document.body.appendChild(el);
    await flushMount();
    expect(String(fetchFn.mock.calls[0]?.[0])).toContain('skin=dark');
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
